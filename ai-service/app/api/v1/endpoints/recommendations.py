from fastapi import APIRouter
from app.models.recommendations import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import calculate_customer_recommendations

router = APIRouter()


@router.post("/recommendations/customer", response_model=RecommendationResponse)
def get_customer_recommendations(payload: RecommendationRequest) -> RecommendationResponse:
    return calculate_customer_recommendations(payload)
