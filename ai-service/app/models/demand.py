from typing import List
from pydantic import BaseModel, Field


class HourlyDemand(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    order_volume: int
    demand_level: str  # High, Medium, Low


class DailyDemand(BaseModel):
    day: str
    order_volume: int
    demand_level: str


class PopularCategory(BaseModel):
    category_name: str
    share_percentage: float


class PopularMenuItem(BaseModel):
    item_name: str
    orders_count: int


class DemandForecastRequest(BaseModel):
    historical_orders: List[dict] = []


class DemandForecastResponse(BaseModel):
    busy_hours: List[HourlyDemand]
    busy_days: List[DailyDemand]
    popular_categories: List[PopularCategory]
    popular_menu_items: List[PopularMenuItem]
