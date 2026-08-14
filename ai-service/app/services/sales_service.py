# Algorithm: Facebook Prophet (time-series additive model) fit on HistoricalSalesPoint (date -> ds, revenue -> y).
# Fallback Condition: If fewer than 14 historical daily data points are provided (or if Prophet fails to fit),
# the service degrades to an exponential moving average + day-of-week multiplier heuristic, setting confidence_score lower (0.50 - 0.65)
# to signal reliance on baseline heuristic rather than ML inference.

from datetime import datetime, timedelta
import logging
from typing import List
import pandas as pd
import numpy as np

from app.models.sales import SalesForecastRequest, SalesForecastResponse, ForecastPoint

logger = logging.getLogger(__name__)


def calculate_sales_forecast(req: SalesForecastRequest) -> SalesForecastResponse:
    points = req.historical_sales
    start_date = datetime.now()
    days_to_predict = max(30, req.days_to_predict or 30)

    # Process historical data
    valid_points = [p for p in points if p.revenue > 0 and p.date] if points else []

    use_prophet = False
    forecast_df = None

    if len(valid_points) >= 14:
        try:
            from prophet import Prophet

            # Build DataFrame
            df = pd.DataFrame([{"ds": p.date, "y": p.revenue} for p in valid_points])
            df['ds'] = pd.to_datetime(df['ds'])
            df = df.groupby('ds', as_index=False)['y'].sum().sort_values('ds')

            if len(df) >= 14:
                m = Prophet(
                    daily_seasonality=False,
                    weekly_seasonality=True,
                    yearly_seasonality=False,
                    interval_width=0.80
                )
                m.fit(df)

                future = m.make_future_dataframe(periods=days_to_predict, freq='D')
                forecast = m.predict(future)

                # Filter only future predictions
                last_hist_date = df['ds'].max()
                future_forecast = forecast[forecast['ds'] > last_hist_date].copy()

                if len(future_forecast) >= days_to_predict:
                    forecast_df = future_forecast
                    use_prophet = True
        except Exception as e:
            logger.warning(f"Prophet fitting failed: {e}. Falling back to baseline heuristic.")

    if use_prophet and forecast_df is not None:
        forecast_rows = forecast_df.to_dict('records')

        def build_point(row) -> ForecastPoint:
            d_str = row['ds'].strftime("%Y-%m-%d")
            pred = max(0.0, round(float(row['yhat']), 2))
            yhat_lower = max(0.0, float(row['yhat_lower']))
            yhat_upper = max(0.0, float(row['yhat_upper']))

            spread = (yhat_upper - yhat_lower) / (2 * max(pred, 1.0))
            conf = round(max(0.10, min(0.95, 1.0 - spread)), 2)
            return ForecastPoint(date=d_str, predicted_revenue=pred, confidence_score=conf)

        points_list = [build_point(r) for r in forecast_rows]

        tomorrow = points_list[0]
        next_7 = points_list[:7]
        next_month = points_list[:30]
        overall_conf = round(float(np.mean([p.confidence_score for p in next_7])), 2)

        return SalesForecastResponse(
            tomorrow=tomorrow,
            next_7_days=next_7,
            next_month=next_month,
            overall_confidence=overall_conf,
        )

    # Fallback Heuristic Path (< 14 data points)
    base_revenue = 15000.0
    growth_rate = 1.02

    if valid_points:
        revenues = [p.revenue for p in valid_points]
        base_revenue = float(np.mean(revenues))
        if len(revenues) >= 7:
            recent_avg = float(np.mean(revenues[-7:]))
            older_avg = float(np.mean(revenues[:7]))
            if older_avg > 0:
                growth_rate = max(0.9, min(1.2, recent_avg / older_avg))

    # Tomorrow
    tomorrow_date = (start_date + timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow_val = round(base_revenue * growth_rate, 2)
    tomorrow = ForecastPoint(date=tomorrow_date, predicted_revenue=tomorrow_val, confidence_score=0.60)

    # Next 7 Days
    next_7 = []
    for i in range(1, 8):
        dt = start_date + timedelta(days=i)
        d_str = dt.strftime("%Y-%m-%d")
        factor = 1.15 if dt.weekday() in (4, 5) else 0.95
        val = round(base_revenue * growth_rate * factor, 2)
        next_7.append(ForecastPoint(date=d_str, predicted_revenue=val, confidence_score=0.55))

    # Next Month (30 days)
    next_month = []
    for i in range(1, 31):
        dt = start_date + timedelta(days=i)
        d_str = dt.strftime("%Y-%m-%d")
        factor = 1.2 if dt.weekday() in (4, 5) else 0.95
        val = round(base_revenue * (growth_rate ** (i / 15)) * factor, 2)
        next_month.append(ForecastPoint(date=d_str, predicted_revenue=val, confidence_score=0.50))

    return SalesForecastResponse(
        tomorrow=tomorrow,
        next_7_days=next_7,
        next_month=next_month,
        overall_confidence=0.55,
    )
