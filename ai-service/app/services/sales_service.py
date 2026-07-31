from datetime import datetime, timedelta
from typing import List
from app.models.sales import SalesForecastRequest, SalesForecastResponse, ForecastPoint


def calculate_sales_forecast(req: SalesForecastRequest) -> SalesForecastResponse:
    points = req.historical_sales
    base_revenue = 15000.0
    growth_rate = 1.02

    if points:
        revenues = [p.revenue for p in points if p.revenue > 0]
        if revenues:
            base_revenue = sum(revenues) / len(revenues)
            if len(revenues) >= 7:
                recent_avg = sum(revenues[-7:]) / 7
                older_avg = sum(revenues[:7]) / 7
                if older_avg > 0:
                    growth_rate = max(0.9, min(1.2, recent_avg / older_avg))

    start_date = datetime.now()

    # Tomorrow
    tomorrow_date = (start_date + timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow_val = round(base_revenue * growth_rate, 2)
    tomorrow = ForecastPoint(date=tomorrow_date, predicted_revenue=tomorrow_val, confidence_score=0.92)

    # Next 7 Days
    next_7 = []
    for i in range(1, 8):
        d_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        factor = 1.15 if (start_date + timedelta(days=i)).weekday() in (4, 5) else 0.95
        val = round(base_revenue * growth_rate * factor, 2)
        next_7.append(ForecastPoint(date=d_str, predicted_revenue=val, confidence_score=0.88))

    # Next Month (30 days)
    next_month = []
    for i in range(1, 31):
        d_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        day_of_week = (start_date + timedelta(days=i)).weekday()
        factor = 1.2 if day_of_week in (4, 5) else 0.95
        val = round(base_revenue * (growth_rate ** (i / 15)) * factor, 2)
        next_month.append(ForecastPoint(date=d_str, predicted_revenue=val, confidence_score=0.84))

    return SalesForecastResponse(
        tomorrow=tomorrow,
        next_7_days=next_7,
        next_month=next_month,
        overall_confidence=0.88,
    )
