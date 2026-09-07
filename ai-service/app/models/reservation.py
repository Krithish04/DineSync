from typing import Optional, List
from pydantic import BaseModel, Field


class ReservationParseRequest(BaseModel):
    query: str
    current_date: Optional[str] = None


class ParsedReservationSlots(BaseModel):
    reservation_date: Optional[str] = None
    reservation_time: Optional[str] = None
    number_of_guests: int = 2
    cuisine: Optional[str] = None
    area_or_location: Optional[str] = None
    special_requests: Optional[str] = None
    dietary_preferences: List[str] = []
    confidence_score: float = Field(default=0.90, ge=0.0, le=1.0)


class ReservationSlotRecommendationRequest(BaseModel):
    reservation_date: str
    party_size: int = 2
    active_reservations_count: int = 0
    operating_hours: List[str] = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00", "22:00"]


class RecommendedTimeSlot(BaseModel):
    time: str
    availability_status: str  # High Availability, Moderate, Congested
    congestion_percentage: int
    recommendation_tag: Optional[str] = None


class ReservationSlotRecommendationResponse(BaseModel):
    reservation_date: str
    recommended_slots: List[RecommendedTimeSlot]
