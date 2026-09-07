---
name: ai-inventory-waste-maintainer
description: >-
  Maintains LinearRegression stock consumption forecasting, XGBoost food waste
  classifier, and 100% deterministic allergen safety checks.
---

# AI Inventory, Food Waste & Allergen Maintainer Skill

Use this skill to audit, test, or troubleshoot ingredient stock exhaustion predictions, perishable food waste risk classification, and diner allergen filtering.

## System Overview

1. **LinearRegression Inventory Model (`inventory_service.py`)**:
   - Fits `LinearRegression` on daily consumption rates to project stock depletion date and `days_remaining`.
   - Recommended purchase quantity:
     $$\text{Purchase Qty} = \max(10.0, (3 \cdot \text{reorder\_level}) - \text{current\_stock})$$
   - Fallback: Simple division (`stock / daily_rate`).

2. **XGBoost Food Waste Classifier (`waste_service.py`)**:
   - `XGBClassifier` trained on overstock ratios, expiry risk days, and stock age.
   - Outputs risk levels: **High**, **Medium**, **Low**.
   - Calculates financial loss: $\text{overstock\_qty} \times \text{cost\_per\_unit}$.
   - Fallback: Perishable threshold rules ($\text{overstock} > 3\text{kg}$ or $\text{expiry} \le 2\text{ days} \rightarrow \text{High}$).

3. **Deterministic Allergen Safety Engine (`recommendationEngine.service.js`)**:
   - Performs a 2-tier allergen safety audit:
     1. Explicit item allergens & tags.
     2. Mapped `Recipe` ingredient documents & `Ingredient` master records.

---

## Maintenance Runbook

### Step 1: Validate Inventory Linear Regression Fit
Inspect [`inventory_service.py`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/ai-service/app/services/inventory_service.py#L41-L61):
- Ensure regression slope check (`slope < 0`) correctly identifies depleting stock trends.

### Step 2: Validate XGBoost Waste Classifier Labels
Inspect [`waste_service.py`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/ai-service/app/services/waste_service.py#L51-L64):
- Verify risk map mapping: `{0: "Low", 1: "Medium", 2: "High"}`.

### Step 3: Audit Allergen Safety Verification
Inspect [`recommendationEngine.service.js`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/backend/src/features/ai/recommendationEngine.service.js#L47-L89):
- Confirm normalization tokens (`normalizeAllergen`) cover Peanuts, Tree Nuts, Dairy, Eggs, Soy, Wheat/Gluten, Fish, Shellfish, and Sesame.
- Ensure warning flags are added if DB recipe metadata is incomplete.
