from fastapi import APIRouter
from app.models.demand import DemandForecastRequest, DemandForecastResponse
from app.services.demand_service import calculate_demand_forecast

router = APIRouter()


@router.post("/forecast/demand", response_model=DemandForecastResponse)
def get_demand_forecast(payload: DemandForecastRequest) -> DemandForecastResponse:
    return calculate_demand_forecast(payload)
