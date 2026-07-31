from pydantic import BaseModel, Field


class WaitTimeRequest(BaseModel):
    active_orders_count: int = 0
    occupied_tables_count: int = 0
    kitchen_pending_tickets: int = 0
    party_size: int = 2


class WaitTimeResponse(BaseModel):
    estimated_queue_time_minutes: int
    estimated_table_wait_time_minutes: int
    estimated_kitchen_delay_minutes: int
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    status: str  # Normal, Moderate Delay, High Traffic
