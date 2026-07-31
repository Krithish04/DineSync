from typing import List, Optional
from pydantic import BaseModel, Field


class IngredientStockInfo(BaseModel):
    ingredient_name: str
    current_stock: float
    reorder_level: float
    unit: str
    daily_consumption_rate: float = 0.0
    purchase_price: float = 0.0


class InventoryForecastItem(BaseModel):
    ingredient_name: str
    current_stock: float
    unit: str
    predicted_low_stock_date: str
    days_remaining: int
    recommended_purchase_qty: float
    estimated_cost: float


class InventoryForecastRequest(BaseModel):
    ingredients: List[IngredientStockInfo] = []


class InventoryForecastResponse(BaseModel):
    low_stock_predictions: List[InventoryForecastItem]
    purchase_recommendations: List[InventoryForecastItem]
    total_estimated_purchase_cost: float
