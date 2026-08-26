from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.services.chatbot_service import process_chatbot_query

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])


class ChatQueryRequest(BaseModel):
    message: str
    mood: Optional[str] = None
    allergens: Optional[List[str]] = []
    budget: Optional[float] = None
    customerId: Optional[str] = None


@router.post("/query")
def handle_chatbot_query(req: ChatQueryRequest) -> Dict[str, Any]:
    try:
        payload = req.model_dump()
        result = process_chatbot_query(payload)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
