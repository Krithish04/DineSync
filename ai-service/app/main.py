from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.api.v1.router import api_router

settings = get_settings()


def create_app() -> FastAPI:
    """
    Application factory for the DineSync AI service.
    Kept independent from the Node.js backend and the React frontend —
    communicates with them only over HTTP.
    """
    app = FastAPI(
        title=settings.project_name,
        description="Independent AI microservice for DineSync AI's intelligent restaurant ecosystem.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.detail, "data": None},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc: RequestValidationError):
        errors = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": "Validation failed", "errors": errors},
        )

    @app.get("/", tags=["Root"])
    def root() -> dict:
        return {
            "success": True,
            "message": f"Welcome to the {settings.project_name}",
            "data": {"docs": "/docs", "health": f"{settings.api_v1_prefix}/health"},
        }

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
