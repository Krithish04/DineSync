from typing import List
from pydantic import BaseModel, Field


class WasteRiskItem(BaseModel):
    ingredient_name: str
    risk_level: str  # High, Medium, Low
    overstock_qty: float
    expiry_risk_days: int
    estimated_loss: float


class FoodWasteRequest(BaseModel):
    ingredients_stock: List[dict] = []
    waste_history: List[dict] = []


class FoodWasteResponse(BaseModel):
    estimated_waste_percentage: float = Field(..., ge=0.0, le=100.0)
    overstock_risk_count: int
    ingredient_expiry_risk_count: int
    high_risk_items: List[WasteRiskItem]
    prevention_tips: List[str]
