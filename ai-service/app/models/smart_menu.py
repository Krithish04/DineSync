from typing import List
from pydantic import BaseModel


class MenuItemPerformance(BaseModel):
    item_name: str
    category: str = ""
    total_revenue: float
    total_qty: int
    profit_margin: float = 0.0
    recommendation_tag: str  # Best Seller, Seasonal, Low Performing


class SmartMenuRequest(BaseModel):
    items_data: List[dict] = []


class SmartMenuResponse(BaseModel):
    best_selling_items: List[MenuItemPerformance]
    seasonal_items: List[MenuItemPerformance]
    low_performing_items: List[MenuItemPerformance]
    actionable_suggestions: List[str]
