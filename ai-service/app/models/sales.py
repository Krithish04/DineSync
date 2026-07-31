from typing import List, Optional
from pydantic import BaseModel, Field


class HistoricalSalesPoint(BaseModel):
    date: str
    revenue: float
    orders_count: int = 0


class SalesForecastRequest(BaseModel):
    historical_sales: List[HistoricalSalesPoint] = []
    days_to_predict: int = 30


class ForecastPoint(BaseModel):
    date: str
    predicted_revenue: float
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class SalesForecastResponse(BaseModel):
    tomorrow: ForecastPoint
    next_7_days: List[ForecastPoint]
    next_month: List[ForecastPoint]
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
