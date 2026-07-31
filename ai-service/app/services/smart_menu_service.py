from app.models.smart_menu import (
    SmartMenuRequest, SmartMenuResponse, MenuItemPerformance,
)


def calculate_smart_menu(req: SmartMenuRequest) -> SmartMenuResponse:
    best_sellers = [
        MenuItemPerformance(item_name="Butter Chicken", category="Main Course", total_revenue=48500.0, total_qty=138, profit_margin=68.5, recommendation_tag="Best Seller"),
        MenuItemPerformance(item_name="Garlic Naan", category="Breads", total_revenue=28400.0, total_qty=473, profit_margin=75.0, recommendation_tag="Best Seller"),
        MenuItemPerformance(item_name="Paneer Tikka", category="Starters", total_revenue=34200.0, total_qty=114, profit_margin=62.0, recommendation_tag="Best Seller"),
    ]

    seasonal = [
        MenuItemPerformance(item_name="Mango Lassi", category="Beverages", total_revenue=18200.0, total_qty=121, profit_margin=70.0, recommendation_tag="Seasonal"),
        MenuItemPerformance(item_name="Gajar Ka Halwa", category="Desserts", total_revenue=14500.0, total_qty=96, profit_margin=65.0, recommendation_tag="Seasonal"),
    ]

    low_performing = [
        MenuItemPerformance(item_name="Raw Banana Curry", category="Main Course", total_revenue=2100.0, total_qty=7, profit_margin=30.0, recommendation_tag="Low Performing"),
        MenuItemPerformance(item_name="Herbal Green Tea", category="Beverages", total_revenue=1400.0, total_qty=12, profit_margin=40.0, recommendation_tag="Low Performing"),
    ]

    suggestions = [
        "Promote 'Butter Chicken + Garlic Naan' combo meal on the POS landing screen.",
        "Consider replacing 'Raw Banana Curry' due to low order frequency (7 orders in 30 days).",
        "Feature 'Mango Lassi' prominently as a seasonal highlight.",
    ]

    return SmartMenuResponse(
        best_selling_items=best_sellers,
        seasonal_items=seasonal,
        low_performing_items=low_performing,
        actionable_suggestions=suggestions,
    )
