from fastapi import APIRouter
from app.models.sales import SalesForecastRequest, SalesForecastResponse
from app.services.sales_service import calculate_sales_forecast

router = APIRouter()


@router.post("/forecast/sales", response_model=SalesForecastResponse)
def get_sales_forecast(payload: SalesForecastRequest) -> SalesForecastResponse:
    return calculate_sales_forecast(payload)
