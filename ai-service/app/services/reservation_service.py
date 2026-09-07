# Algorithm: Regex & Rule-Based NLU Slot Extractor combined with Time-Slot Congestion Scoring for Table Reservations.
# Extracts: reservation_date, reservation_time, number_of_guests, cuisine, location, special_requests, dietary_preferences.

from datetime import datetime, timedelta
import logging
import re
from typing import List, Optional

from app.models.reservation import (
    ReservationParseRequest, ParsedReservationSlots,
    ReservationSlotRecommendationRequest, ReservationSlotRecommendationResponse, RecommendedTimeSlot
)

logger = logging.getLogger(__name__)

DAY_OFFSETS = {
    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
    'friday': 4, 'saturday': 5, 'sunday': 6,
    'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6,
}

CUISINES_LIST = [
    'north indian', 'south indian', 'mughlai', 'chinese', 'italian',
    'punjabi', 'awadhi', 'continental', 'mexican', 'thai', 'desserts', 'beverages'
]

LOCATIONS_LIST = [
    'connaught place', 'cp', 'khan market', 'hauz khas', 'south delhi',
    'gurugram', 'gurgaon', 'noida', 'old delhi', 'saket', 'vasant vihar'
]


def parse_natural_language_booking(req: ReservationParseRequest) -> ParsedReservationSlots:
    raw_text = (req.query or "").strip().lower()
    now = datetime.now()
    
    # 1. Date extraction
    extracted_date = now.strftime("%Y-%m-%d")
    if 'tomorrow' in raw_text or 'kal' in raw_text:
        extracted_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    elif 'today' in raw_text or 'aaj' in raw_text:
        extracted_date = now.strftime("%Y-%m-%d")
    else:
        # Check day names (e.g. "this friday", "next saturday")
        for day_name, offset in DAY_OFFSETS.items():
            if day_name in raw_text:
                today_weekday = now.weekday()
                days_ahead = (offset - today_weekday) % 7
                if days_ahead == 0:
                    days_ahead = 7
                extracted_date = (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
                break
        
        # Check ISO format YYYY-MM-DD or DD/MM
        iso_match = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', raw_text)
        if iso_match:
            extracted_date = iso_match.group(1)

    # 2. Time extraction (e.g. "8pm", "8:30 pm", "20:00", "7 pm", "at 8")
    extracted_time = "19:30"
    time_match = re.search(r'\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b', raw_text)
    if time_match:
        hr = int(time_match.group(1))
        mn = int(time_match.group(2) or 0)
        ampm = time_match.group(3)
        if ampm == 'pm' and hr < 12:
            hr += 12
        elif ampm == 'am' and hr == 12:
            hr = 0
        extracted_time = f"{hr:02d}:{mn:02d}"
    else:
        military_match = re.search(r'\b([01]?\d|2[0-3]):([0-5]\d)\b', raw_text)
        if military_match:
            extracted_time = military_match.group(0)

    # 3. Party size extraction (e.g. "table for 4", "4 people", "4 guests", "for 2")
    party_size = 2
    party_match = re.search(r'\b(?:for|party of|table for|guests?|people)\s*(\d{1,2})\b', raw_text) or \
                  re.search(r'\b(\d{1,2})\s*(?:people|guests|persons?|pax)\b', raw_text)
    if party_match:
        try:
            party_size = max(1, min(20, int(party_match.group(1))))
        except ValueError:
            pass

    # 4. Cuisine extraction
    extracted_cuisine = next((c.title() for c in CUISINES_LIST if c in raw_text), None)

    # 5. Location extraction
    extracted_location = next((loc.title() for loc in LOCATIONS_LIST if loc in raw_text), None)

    # 6. Special requests (window seat, anniversary, birthday, quiet area, booth)
    special_reqs = []
    if 'window' in raw_text:
        special_reqs.append('Window seat preferred')
    if 'anniversary' in raw_text:
        special_reqs.append('Anniversary celebration')
    if 'birthday' in raw_text:
        special_reqs.append('Birthday celebration')
    if 'quiet' in raw_text:
        special_reqs.append('Quiet table')
    if 'outdoor' in raw_text or 'balcony' in raw_text:
        special_reqs.append('Outdoor seating')

    special_requests_str = ", ".join(special_reqs) if special_reqs else None

    # 7. Dietary preferences
    dietary = []
    if 'veg' in raw_text and 'non' not in raw_text:
        dietary.append('Veg')
    elif 'vegan' in raw_text:
        dietary.append('Vegan')
    elif 'jain' in raw_text:
        dietary.append('Jain')

    return ParsedReservationSlots(
        reservation_date=extracted_date,
        reservation_time=extracted_time,
        number_of_guests=party_size,
        cuisine=extracted_cuisine,
        area_or_location=extracted_location,
        special_requests=special_requests_str,
        dietary_preferences=dietary,
        confidence_score=0.92,
    )


def calculate_recommended_booking_slots(req: ReservationSlotRecommendationRequest) -> ReservationSlotRecommendationResponse:
    op_hours = req.operating_hours or ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00", "22:00"]
    active_cnt = req.active_reservations_count or 0

    recommended: List[RecommendedTimeSlot] = []

    for slot_time in op_hours:
        hr = int(slot_time.split(":")[0])

        # Prime dining hours (19:00 - 21:00) have higher base congestion
        if 19 <= hr <= 21:
            base_congestion = min(95, 45 + (active_cnt * 6))
        elif 13 <= hr <= 14:
            base_congestion = min(85, 35 + (active_cnt * 5))
        else:
            base_congestion = max(10, 20 + (active_cnt * 3))

        if base_congestion < 40:
            status = "High Availability"
            tag = "Chef Recommended (Quiet & Fast Service)"
        elif base_congestion < 75:
            status = "Moderate"
            tag = "Popular Slot"
        else:
            status = "Congested"
            tag = "Peak Demand Window"

        recommended.append(
            RecommendedTimeSlot(
                time=slot_time,
                availability_status=status,
                congestion_percentage=base_congestion,
                recommendation_tag=tag
            )
        )

    return ReservationSlotRecommendationResponse(
        reservation_date=req.reservation_date,
        recommended_slots=recommended,
    )
