from typing import List, Optional
from pydantic import BaseModel, Field


class CustomerFeedbackItem(BaseModel):
    feedback_text: str
    rating: float = 5.0
    customer_name: Optional[str] = None


class SentimentAnalysisRequest(BaseModel):
    feedbacks: List[CustomerFeedbackItem] = []


class SentimentAnalysisResponse(BaseModel):
    execution_mode: str = "AI_LIVE_MODEL"
    overall_sentiment: str  # Positive, Neutral, Negative
    sentiment_score: float = Field(..., ge=0.0, le=10.0)
    positive_count: int
    neutral_count: int
    negative_count: int
    positive_percentage: float
    key_themes: List[str] = []
    aspect_sentiments: Optional[dict] = None
    actionable_tips: List[str] = []
