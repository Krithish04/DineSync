from fastapi import APIRouter
from app.models.waste import FoodWasteRequest, FoodWasteResponse
from app.services.waste_service import calculate_food_waste

router = APIRouter()


@router.post("/predict/food-waste", response_model=FoodWasteResponse)
def get_food_waste_prediction(payload: FoodWasteRequest) -> FoodWasteResponse:
    return calculate_food_waste(payload)
