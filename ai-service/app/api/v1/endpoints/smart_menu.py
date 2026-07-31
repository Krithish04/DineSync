from fastapi import APIRouter
from app.models.smart_menu import SmartMenuRequest, SmartMenuResponse
from app.services.smart_menu_service import calculate_smart_menu

router = APIRouter()


@router.post("/recommendations/smart-menu", response_model=SmartMenuResponse)
def get_smart_menu_recommendations(payload: SmartMenuRequest) -> SmartMenuResponse:
    return calculate_smart_menu(payload)
