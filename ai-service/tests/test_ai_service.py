import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint status and welcome payload"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "DineSync" in data["message"]
    assert "health" in data["data"]


def test_health_check_endpoint():
    """Verify health check endpoint status"""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "healthy"


def test_sales_forecast_endpoint():
    """Verify Prophet / LinearRegression sales forecast model endpoint"""
    payload = {
        "historical_sales": [
            {"date": "2026-09-01", "revenue": 12000, "orders_count": 45},
            {"date": "2026-09-02", "revenue": 13500, "orders_count": 50},
            {"date": "2026-09-03", "revenue": 11000, "orders_count": 40},
            {"date": "2026-09-04", "revenue": 15000, "orders_count": 55},
            {"date": "2026-09-05", "revenue": 18000, "orders_count": 65},
            {"date": "2026-09-06", "revenue": 20000, "orders_count": 70},
            {"date": "2026-09-07", "revenue": 14000, "orders_count": 48},
        ],
        "days_to_predict": 7,
    }
    response = client.post("/api/v1/forecast/sales", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "next_7_days" in data or "tomorrow" in data


def test_demand_forecast_endpoint():
    """Verify demand forecasting model endpoint"""
    payload = {
        "restaurantId": "test_rest_123",
        "targetDate": "2026-09-10",
        "historicalOrders": [
            {"menuItemId": "item1", "name": "Paneer Butter Masala", "quantity": 25, "date": "2026-09-03"},
            {"menuItemId": "item1", "name": "Paneer Butter Masala", "quantity": 30, "date": "2026-09-04"},
            {"menuItemId": "item2", "name": "Butter Naan", "quantity": 60, "date": "2026-09-03"},
        ],
    }
    response = client.post("/api/v1/forecast/demand", json=payload)
    assert response.status_code == 200


def test_inventory_forecast_endpoint():
    """Verify inventory stock depletion model endpoint"""
    payload = {
        "ingredients": [
            {
                "ingredient_name": "Paneer",
                "current_stock": 5.0,
                "reorder_level": 10.0,
                "unit": "kg",
                "daily_consumption_rate": 1.2,
                "purchase_price": 350.0,
            },
            {
                "ingredient_name": "Tomatoes",
                "current_stock": 2.0,
                "reorder_level": 5.0,
                "unit": "kg",
                "daily_consumption_rate": 1.5,
                "purchase_price": 40.0,
            },
        ],
    }
    response = client.post("/api/v1/forecast/inventory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "low_stock_predictions" in data


def test_chatbot_endpoint():
    """Verify AI Waiter Assistant NLU & conversation endpoint"""
    payload = {
        "message": "Recommend fresh salads under ₹300",
        "allergens": [],
        "budget": 300.0,
    }
    response = client.post("/api/v1/chatbot/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data


def test_smart_menu_recommendations_endpoint():
    """Verify Smart Menu recommendation endpoint"""
    payload = {
        "restaurantId": "test_rest_123",
        "items": [
            {"_id": "m1", "name": "Paneer Tikka", "price": 280, "salesCount": 150, "category": "Starters"},
            {"_id": "m2", "name": "Dal Makhani", "price": 320, "salesCount": 200, "category": "Main Course"},
        ],
    }
    response = client.post("/api/v1/recommendations/smart-menu", json=payload)
    assert response.status_code == 200


def test_food_waste_prediction_endpoint():
    """Verify food waste classification model endpoint"""
    payload = {
        "restaurantId": "test_rest_123",
        "prepDate": "2026-09-09",
        "preparedItems": [
            {"ingredientName": "Rice", "quantityPrepared": 20.0, "unit": "kg", "historicalWastePercentage": 12.5},
        ],
    }
    response = client.post("/api/v1/predict/food-waste", json=payload)
    assert response.status_code == 200


def test_kitchen_schedule_endpoint():
    """Verify kitchen schedule optimization endpoint and priority flags"""
    payload = {
        "restaurantId": "rest_123",
        "currentTime": "2026-09-09T10:15:00Z",
        "tickets": [
            {
                "ticketId": "t1",
                "ticketNumber": "ORD-101-MAIN",
                "orderId": "ord_101",
                "station": "Main Kitchen",
                "status": "Preparing",
                "createdAt": "2026-09-09T10:00:00Z",
                "items": [
                    {
                        "orderItemId": "item_1",
                        "menuItem": "m1",
                        "itemName": "Paneer Butter Masala",
                        "quantity": 2,
                        "kitchenStation": "Main Kitchen",
                        "priority": "medium",
                        "preparationTime": 15,
                        "kitchenStatus": "Preparing",
                    }
                ],
            },
            {
                "ticketId": "t2",
                "ticketNumber": "ORD-101-STARTER",
                "orderId": "ord_101",
                "station": "Main Kitchen",
                "status": "Pending",
                "createdAt": "2026-09-09T10:00:00Z",
                "items": [
                    {
                        "orderItemId": "item_2",
                        "menuItem": "m2",
                        "itemName": "Paneer Tikka Starter",
                        "quantity": 1,
                        "kitchenStation": "Main Kitchen",
                        "priority": "high",
                        "preparationTime": 10,
                        "kitchenStatus": "Pending",
                        "isStarter": True,
                    }
                ],
            },
        ],
    }
    response = client.post("/api/v1/kitchen/schedule", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["restaurantId"] == "rest_123"
    assert data["totalActiveTickets"] == 2
    assert "Main Kitchen" in data["stationQueues"]
    # Starter ticket (t2) should be sequenced first due to high priority + starter boost
    queue = data["stationQueues"]["Main Kitchen"]
    assert queue[0]["ticketId"] == "t2"
    assert queue[0]["priorityFlag"] in ["on-track", "at-risk", "late"]

