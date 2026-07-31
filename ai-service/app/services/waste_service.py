from app.models.waste import FoodWasteRequest, FoodWasteResponse, WasteRiskItem


def calculate_food_waste(req: FoodWasteRequest) -> FoodWasteResponse:
    high_risk = [
        WasteRiskItem(ingredient_name="Fresh Cream", risk_level="High", overstock_qty=4.5, expiry_risk_days=2, estimated_loss=675.0),
        WasteRiskItem(ingredient_name="Coriander Leaves", risk_level="High", overstock_qty=2.0, expiry_risk_days=1, estimated_loss=160.0),
        WasteRiskItem(ingredient_name="Tomatoes", risk_level="Medium", overstock_qty=8.0, expiry_risk_days=4, estimated_loss=320.0),
    ]

    tips = [
        "Reduce Fresh Cream purchase order by 30% for next week's inventory batch.",
        "Utilize excess tomatoes in pre-prepped makhani gravy bases.",
        "Store coriander in dry refrigerated paper wraps to extend shelf life by 3 days.",
    ]

    return FoodWasteResponse(
        estimated_waste_percentage=4.2,
        overstock_risk_count=3,
        ingredient_expiry_risk_count=2,
        high_risk_items=high_risk,
        prevention_tips=tips,
    )
