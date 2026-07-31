from fastapi import APIRouter
from app.models.sentiment import SentimentAnalysisRequest, SentimentAnalysisResponse
from app.services.sentiment_service import calculate_sentiment_analysis

router = APIRouter()


@router.post("/sentiment/analyze", response_model=SentimentAnalysisResponse)
def analyze_customer_sentiment(payload: SentimentAnalysisRequest) -> SentimentAnalysisResponse:
    return calculate_sentiment_analysis(payload)
