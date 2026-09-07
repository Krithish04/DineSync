from fastapi import APIRouter
from app.models.reservation import (
    ReservationParseRequest, ParsedReservationSlots,
    ReservationSlotRecommendationRequest, ReservationSlotRecommendationResponse
)
from app.services.reservation_service import (
    parse_natural_language_booking, calculate_recommended_booking_slots
)

router = APIRouter(prefix="/reservation", tags=["Reservation AI Services"])


@router.post("/parse", response_model=ParsedReservationSlots)
def parse_booking_query(req: ReservationParseRequest):
    """
    Parses a natural-language diner query string into structured reservation slots.
    """
    return parse_natural_language_booking(req)


@router.post("/recommend-slots", response_model=ReservationSlotRecommendationResponse)
def recommend_booking_slots(req: ReservationSlotRecommendationRequest):
    """
    Calculates time-slot congestion scores and recommends optimal reservation times.
    """
    return calculate_recommended_booking_slots(req)
