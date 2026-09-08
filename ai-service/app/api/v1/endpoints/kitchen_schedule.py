from fastapi import APIRouter, HTTPException
from app.models.kitchen_schedule import KitchenScheduleRequest, KitchenScheduleResponse
from app.services.kitchen_schedule_service import calculate_kitchen_schedule

router = APIRouter()

@router.post("/kitchen/schedule", response_model=KitchenScheduleResponse)
async def get_kitchen_schedule(req: KitchenScheduleRequest):
    try:
        return calculate_kitchen_schedule(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kitchen schedule optimization error: {str(e)}")
