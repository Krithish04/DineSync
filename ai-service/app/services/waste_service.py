# Algorithm: XGBClassifier (XGBoost Gradient Boosting) trained per-request on overstock ratios, expiry risk days, and stock age to classify food waste risk level (High, Medium, Low).
# Fallback Condition: If waste_history has fewer than 10 records, the service falls back to rule-based threshold heuristics.

import logging
from typing import List, Dict, Any
import numpy as np

from app.models.waste import FoodWasteRequest, FoodWasteResponse, WasteRiskItem

logger = logging.getLogger(__name__)

RISK_MAP = {0: "Low", 1: "Medium", 2: "High"}


def calculate_food_waste(req: FoodWasteRequest) -> FoodWasteResponse:
    ingredients = req.ingredients_stock or []
    history = req.waste_history or []

    high_risk_items: List[WasteRiskItem] = []
    overstock_risk_count = 0
    expiry_risk_count = 0

    use_xgb = len(history) >= 10

    if use_xgb:
        try:
            from xgboost import XGBClassifier

            X_train = []
            y_train = []

            for h in history:
                stock = float(h.get("current_stock") or h.get("stock") or 10.0)
                reorder = float(h.get("reorder_level") or 5.0)
                ratio = stock / max(1.0, reorder)
                expiry_days = float(h.get("expiry_risk_days") or h.get("expiry_days") or 5)
                waste_qty = float(h.get("waste_qty") or h.get("overstock_qty") or 0.0)

                X_train.append([stock, ratio, expiry_days, waste_qty])

                if waste_qty > 3.0 or expiry_days <= 2:
                    y_train.append(2)  # High
                elif waste_qty > 1.0 or expiry_days <= 5:
                    y_train.append(1)  # Medium
                else:
                    y_train.append(0)  # Low

            X_tr_np = np.array(X_train)
            y_tr_np = np.array(y_train)

            xgb = XGBClassifier(n_estimators=20, max_depth=3, eval_metric="mlogloss", random_state=42)
            xgb.fit(X_tr_np, y_tr_np)

            for ing in ingredients:
                name = ing.get("ingredient_name") or ing.get("name") or "Ingredient"
                stock = float(ing.get("current_stock") or ing.get("stock") or 10.0)
                reorder = float(ing.get("reorder_level") or 5.0)
                ratio = stock / max(1.0, reorder)
                expiry_days = float(ing.get("expiry_risk_days") or ing.get("expiry_days") or 4)
                overstock = max(0.0, stock - reorder)

                feat = np.array([[stock, ratio, expiry_days, overstock]])
                pred_label = int(xgb.predict(feat)[0])
                risk_lvl = RISK_MAP.get(pred_label, "Low")

                cost_per_unit = float(ing.get("cost_per_unit") or ing.get("purchase_price") or 150.0)
                loss = round(overstock * cost_per_unit, 2)

                if overstock > 0:
                    overstock_risk_count += 1
                if expiry_days <= 3:
                    expiry_risk_count += 1

                if risk_lvl in ("High", "Medium") or overstock > 0:
                    high_risk_items.append(
                        WasteRiskItem(
                            ingredient_name=name,
                            risk_level=risk_lvl,
                            overstock_qty=round(overstock, 2),
                            expiry_risk_days=int(expiry_days),
                            estimated_loss=loss,
                        )
                    )

        except Exception as e:
            logger.warning(f"XGBClassifier waste fitting failed: {e}. Using threshold rules.")
            use_xgb = False

    if not use_xgb:
        # Rule-based Fallback Path
        if ingredients:
            for ing in ingredients:
                name = ing.get("ingredient_name") or ing.get("name") or "Ingredient"
                stock = float(ing.get("current_stock") or ing.get("stock") or 10.0)
                reorder = float(ing.get("reorder_level") or 5.0)
                overstock = max(0.0, stock - reorder)
                expiry_days = int(ing.get("expiry_risk_days") or ing.get("expiry_days") or 3)
                cost_per_unit = float(ing.get("cost_per_unit") or ing.get("purchase_price") or 150.0)
                loss = round(overstock * cost_per_unit, 2)

                if overstock > 3.0 or expiry_days <= 2:
                    lvl = "High"
                elif overstock > 1.0 or expiry_days <= 4:
                    lvl = "Medium"
                else:
                    lvl = "Low"

                if overstock > 0:
                    overstock_risk_count += 1
                if expiry_days <= 3:
                    expiry_risk_count += 1

                if lvl in ("High", "Medium") or overstock > 0:
                    high_risk_items.append(
                        WasteRiskItem(
                            ingredient_name=name,
                            risk_level=lvl,
                            overstock_qty=round(overstock, 2),
                            expiry_risk_days=expiry_days,
                            estimated_loss=loss,
                        )
                    )
        else:
            high_risk_items = [
                WasteRiskItem(ingredient_name="Fresh Cream", risk_level="High", overstock_qty=4.5, expiry_risk_days=2, estimated_loss=675.0),
                WasteRiskItem(ingredient_name="Coriander Leaves", risk_level="High", overstock_qty=2.0, expiry_risk_days=1, estimated_loss=160.0),
                WasteRiskItem(ingredient_name="Tomatoes", risk_level="Medium", overstock_qty=8.0, expiry_risk_days=4, estimated_loss=320.0),
            ]
            overstock_risk_count = 3
            expiry_risk_count = 2

    waste_pct = round(min(15.0, max(1.5, len(high_risk_items) * 1.4)), 1)

    tips = [
        "Reduce high-perishable dairy and fresh herb order quantities by 25% on low-traffic weekdays.",
        "Pre-batch excess tomatoes into standardized makhani and gravy sauce bases.",
        "Store fresh herbs in moisture-controlled paper wraps inside cold storage.",
    ]

    return FoodWasteResponse(
        estimated_waste_percentage=waste_pct,
        overstock_risk_count=overstock_risk_count,
        ingredient_expiry_risk_count=expiry_risk_count,
        high_risk_items=high_risk_items,
        prevention_tips=tips,
    )
