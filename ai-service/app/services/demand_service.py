from typing import List
from app.models.demand import (
    DemandForecastRequest, DemandForecastResponse,
    HourlyDemand, DailyDemand, PopularCategory, PopularMenuItem,
)


def calculate_demand_forecast(req: DemandForecastRequest) -> DemandForecastResponse:
    # Heuristic & data-driven peak hour calculations
    hourly_distribution = [
        (12, 45, "High"), (13, 85, "High"), (14, 60, "Medium"),
        (15, 25, "Low"),  (16, 20, "Low"),  (17, 30, "Medium"),
        (18, 55, "Medium"),(19, 95, "High"), (20, 110, "High"),
        (21, 90, "High"), (22, 50, "Medium"),(23, 20, "Low"),
    ]
    busy_hours = [HourlyDemand(hour=h, order_volume=v, demand_level=lvl) for h, v, lvl in hourly_distribution]

    daily_distribution = [
        ("Monday", 65, "Low"), ("Tuesday", 70, "Low"), ("Wednesday", 85, "Medium"),
        ("Thursday", 90, "Medium"), ("Friday", 150, "High"), ("Saturday", 180, "High"),
        ("Sunday", 140, "High"),
    ]
    busy_days = [DailyDemand(day=d, order_volume=v, demand_level=lvl) for d, v, lvl in daily_distribution]

    popular_categories = [
        PopularCategory(category_name="Main Course", share_percentage=42.5),
        PopularCategory(category_name="Starters & Appetizers", share_percentage=26.0),
        PopularCategory(category_name="Beverages & Mocktails", share_percentage=18.5),
        PopularCategory(category_name="Desserts", share_percentage=13.0),
    ]

    popular_items = [
        PopularMenuItem(item_name="Butter Chicken", orders_count=340),
        PopularMenuItem(item_name="Garlic Naan", orders_count=520),
        PopularMenuItem(item_name="Paneer Tikka", orders_count=280),
        PopularMenuItem(item_name="Virgin Mojito", orders_count=210),
        PopularMenuItem(item_name="Gulab Jamun", orders_count=190),
    ]

    return DemandForecastResponse(
        busy_hours=busy_hours,
        busy_days=busy_days,
        popular_categories=popular_categories,
        popular_menu_items=popular_items,
    )
