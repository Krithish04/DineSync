from typing import List, Optional
from pydantic import BaseModel


class ItemPair(BaseModel):
    item_a: str
    item_b: str
    co_occurrence_count: int
    confidence: float


class CustomerRecommendationItem(BaseModel):
    item_name: str
    reason: str
    score: float


class RecommendationRequest(BaseModel):
    past_order_baskets: List[List[str]] = []
    customer_favorite_items: List[str] = []


class RecommendationResponse(BaseModel):
    frequently_bought_together: List[ItemPair]
    cross_sell_recommendations: List[CustomerRecommendationItem]
    upsell_recommendations: List[CustomerRecommendationItem]
    personalized_menu: List[CustomerRecommendationItem]
