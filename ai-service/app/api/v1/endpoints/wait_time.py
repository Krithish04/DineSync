from fastapi import APIRouter
from app.models.wait_time import WaitTimeRequest, WaitTimeResponse
from app.services.wait_time_service import calculate_wait_time

router = APIRouter()


@router.post("/predict/wait-time", response_model=WaitTimeResponse)
def get_wait_time_prediction(payload: WaitTimeRequest) -> WaitTimeResponse:
    return calculate_wait_time(payload)
