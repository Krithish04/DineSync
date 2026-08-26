from fastapi import APIRouter

from app.api.v1.endpoints import (
    health,
    sales_forecast,
    demand_forecast,
    inventory_forecast,
    recommendations,
    smart_menu,
    wait_time,
    waste_prediction,
    sentiment_analysis,
    chatbot,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(sales_forecast.router, tags=["Sales Forecast"])
api_router.include_router(demand_forecast.router, tags=["Demand Forecast"])
api_router.include_router(inventory_forecast.router, tags=["Inventory Forecast"])
api_router.include_router(recommendations.router, tags=["Customer Recommendations"])
api_router.include_router(smart_menu.router, tags=["Smart Menu Recommendations"])
api_router.include_router(wait_time.router, tags=["Wait Time Prediction"])
api_router.include_router(waste_prediction.router, tags=["Food Waste Prediction"])
api_router.include_router(sentiment_analysis.router, tags=["Sentiment Analysis"])
api_router.include_router(chatbot.router, tags=["AI Chatbot"])
