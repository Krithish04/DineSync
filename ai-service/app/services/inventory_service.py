from datetime import datetime, timedelta
from app.models.inventory import (
    InventoryForecastRequest, InventoryForecastResponse, InventoryForecastItem,
)


def calculate_inventory_forecast(req: InventoryForecastRequest) -> InventoryForecastResponse:
    now = datetime.now()
    predictions = []
    recommendations = []
    total_cost = 0.0

    items = req.ingredients
    if not items:
        # Fallback sample ingredients if empty
        items = [
            type('Ing', (), {'ingredient_name': 'Basmati Rice', 'current_stock': 12.0, 'reorder_level': 15.0, 'unit': 'kg', 'daily_consumption_rate': 4.0, 'purchase_price': 90.0})(),
            type('Ing', (), {'ingredient_name': 'Cooking Oil', 'current_stock': 8.0, 'reorder_level': 10.0, 'unit': 'L', 'daily_consumption_rate': 3.0, 'purchase_price': 140.0})(),
            type('Ing', (), {'ingredient_name': 'Paneer', 'current_stock': 3.5, 'reorder_level': 5.0, 'unit': 'kg', 'daily_consumption_rate': 2.0, 'purchase_price': 320.0})(),
            type('Ing', (), {'ingredient_name': 'Chicken Breast', 'current_stock': 15.0, 'reorder_level': 10.0, 'unit': 'kg', 'daily_consumption_rate': 5.0, 'purchase_price': 240.0})(),
        ]

    for ing in items:
        stock = getattr(ing, 'current_stock', 0.0)
        reorder = getattr(ing, 'reorder_level', 5.0)
        rate = getattr(ing, 'daily_consumption_rate', 2.0) or 2.0
        unit = getattr(ing, 'unit', 'units')
        price = getattr(ing, 'purchase_price', 100.0) or 100.0
        name = getattr(ing, 'ingredient_name', 'Ingredient')

        days_left = max(0, int(stock / rate))
        low_date = (now + timedelta(days=days_left)).strftime("%Y-%m-%d")
        rec_qty = round(max(10.0, (reorder * 3) - stock), 2)
        cost = round(rec_qty * price, 2)

        item_forecast = InventoryForecastItem(
            ingredient_name=name,
            current_stock=stock,
            unit=unit,
            predicted_low_stock_date=low_date,
            days_remaining=days_left,
            recommended_purchase_qty=rec_qty,
            estimated_cost=cost,
        )

        predictions.append(item_forecast)
        if stock <= reorder or days_left <= 3:
            recommendations.append(item_forecast)
            total_cost += cost

    return InventoryForecastResponse(
        low_stock_predictions=predictions,
        purchase_recommendations=recommendations,
        total_estimated_purchase_cost=round(total_cost, 2),
    )
