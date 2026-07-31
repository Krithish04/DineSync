from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health", summary="Health check")
def health_check() -> dict:
    """
    Returns the current health/status of the AI service.
    Used by load balancers, orchestrators, and the main backend to verify
    this service is up before routing AI-powered requests to it.
    """
    return {
        "success": True,
        "service": settings.project_name,
        "environment": settings.environment,
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
