---
name: ai-sales-demand-maintainer
description: >-
  Maintains and audits the Facebook Prophet sales forecasting model,
  RandomForest demand volume forecasting model, and Smart Menu analytics.
---

# AI Sales & Demand Forecasting Maintainer Skill

Use this skill to audit, test, or troubleshoot sales forecasting, peak hour demand predictions, and menu engineering analytics.

## Model Overview

1. **Facebook Prophet (`sales_service.py`)**:
   - Time-series additive model for daily revenue forecasting.
   - **Data threshold**: $\ge 14$ daily sales data points required for Prophet fitting.
   - **Confidence calculation**: Derived dynamically from lower and upper uncertainty bounds ($yhat\_lower, yhat\_upper$).
   - **Fallback**: Exponential Moving Average (EMA) + weekend multiplier ($1.15\times$ for Fri/Sat).

2. **RandomForest Demand Regressor (`demand_service.py`)**:
   - `RandomForestRegressor` (30 estimators) trained on hourly ($0-23$) and daily ($0-6$) feature matrices.
   - Classifies demand level as **High** ($\ge 70\%$), **Medium** ($\ge 35\%$), or **Low**.
   - **Fallback**: Baseline restaurant traffic distribution.

3. **Smart Menu Percentile Ranker (`smart_menu_service.py`)**:
   - Percentile ranking on 75th/25th revenue and volume metrics.
   - Optional BART zero-shot classification (`facebook/bart-large-mnli`) when `USE_ZERO_SHOT_NLP=true`.

---

## Maintenance Runbook

### Step 1: Audit Sales Forecast Prophet Fitting
Check [`sales_service.py`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/ai-service/app/services/sales_service.py):
```python
# Verify Prophet model imports and data sufficiency check
from prophet import Prophet
import pandas as pd

df = pd.DataFrame([{"ds": "2026-09-01", "y": 15000}])
print("Prophet available for time-series fitting")
```

### Step 2: Benchmark Demand Model Classifications
Check [`demand_service.py`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/ai-service/app/services/demand_service.py):
- Verify operating hours range ($12\text{ PM} - 11\text{ PM}$).
- Ensure popular categories and popular menu item counters parse JSON order items correctly.

### Step 3: Validate Smart Menu Cache TTL
Check [`ai.service.js`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/backend/src/features/ai/ai.service.js#L18-L20):
- Ensure `smartMenuCache` TTL is maintained at 5 minutes (`5 * 60 * 1000 ms`).
