from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ScheduleItemInput(BaseModel):
    orderItemId: str
    menuItem: str
    itemName: str
    quantity: int = 1
    kitchenStation: str = "Main Kitchen"
    priority: str = "medium" # "low", "medium", "high"
    preparationTime: int = 15 # minutes
    kitchenStatus: str = "Pending"
    specialInstructions: Optional[str] = ""
    isStarter: Optional[bool] = False

class ScheduleTicketInput(BaseModel):
    ticketId: str
    ticketNumber: str
    orderId: str
    tableId: Optional[str] = None
    tableNumber: Optional[str] = None
    station: str = "Main Kitchen"
    status: str = "Pending" # "Pending", "Preparing", "Ready", "Served", "Delayed"
    createdAt: str # ISO string or timestamp
    items: List[ScheduleItemInput]
    notes: Optional[str] = ""

class KitchenScheduleRequest(BaseModel):
    restaurantId: str
    currentTime: Optional[str] = None
    stationFilter: Optional[str] = None
    tickets: List[ScheduleTicketInput]

class ScoredTicketItem(BaseModel):
    orderItemId: str
    itemName: str
    estimatedPrepMins: int
    estimatedCompletionAt: str
    status: str

class ScoredTicketOutput(BaseModel):
    ticketId: str
    ticketNumber: str
    orderId: str
    station: str
    status: str
    priorityFlag: str # "on-track", "at-risk", "late"
    calculatedPriorityScore: float
    targetReadyTime: str # ISO string
    estimatedCompletionTime: str # ISO string
    sequenceOrder: int
    items: List[ScoredTicketItem]

class KitchenScheduleResponse(BaseModel):
    restaurantId: str
    rescoredAt: str
    totalActiveTickets: int
    stationQueues: Dict[str, List[ScoredTicketOutput]]
    tickets: List[ScoredTicketOutput]
    atRiskCount: int
    lateCount: int
