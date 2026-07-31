from fastapi import APIRouter
from app.models.inventory import InventoryForecastRequest, InventoryForecastResponse
from app.services.inventory_service import calculate_inventory_forecast

router = APIRouter()


@router.post("/forecast/inventory", response_model=InventoryForecastResponse)
def get_inventory_forecast(payload: InventoryForecastRequest) -> InventoryForecastResponse:
    return calculate_inventory_forecast(payload)
