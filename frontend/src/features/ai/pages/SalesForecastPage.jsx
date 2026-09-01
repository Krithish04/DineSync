import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import ForecastCard from '../components/ForecastCard';
import TrendGraph from '../components/TrendGraph';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import ExecutionModeBadge from '../components/ExecutionModeBadge';
import ExportToolbar from '@/features/reports/components/ExportToolbar';
import * as aiApi from '../api/ai.api';

export default function SalesForecastPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [forecast, setForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.getSalesForecast(restaurantId);
      setForecast(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales forecast.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const sevenDayGraphData = (forecast?.next_7_days || []).map((d) => ({
    date: d.date,
    predicted_revenue: d.predicted_revenue,
  }));

  const thirtyDayGraphData = (forecast?.next_month || []).map((d) => ({
    date: d.date,
    predicted_revenue: d.predicted_revenue,
  }));

  return (
    <RestaurantLayout title="AI Sales Revenue Forecast" description="Machine learning predictive revenue modeling for Tomorrow, Next 7 Days, and Next 30 Days.">
      <div className="space-y-6 max-w-full">
        {/* Forecast Source & Execution Mode Badge Bar */}
        {forecast && (
          <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider block">Forecast Engine Source</span>
              <p className="text-sm font-bold text-foreground">
                Predictive sales revenue algorithm execution mode
              </p>
            </div>
            <ExecutionModeBadge executionMode={forecast.execution_mode} />
          </div>
        )}

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && forecast && (
          <>
            {/* Top Forecast Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ForecastCard
                title="Tomorrow's Revenue"
                value={forecast.tomorrow?.predicted_revenue || 0}
                prefix="₹"
                subtitle={`Confidence: ${Math.round((forecast.tomorrow?.confidence || 0.9) * 100)}%`}
                icon={TrendingUp}
                variant="primary"
              />

              <ForecastCard
                title="Next 7 Days Projected"
                value={forecast.summary?.next_7_days_total || 0}
                prefix="₹"
                subtitle={`Daily Avg: ₹${Math.round((forecast.summary?.next_7_days_total || 0) / 7).toLocaleString('en-IN')}`}
                icon={Calendar}
                variant="emerald"
              />

              <ForecastCard
                title="Next Month Projected"
                value={forecast.summary?.next_month_total || 0}
                prefix="₹"
                subtitle={`Confidence: ${Math.round((forecast.overall_confidence || 0.85) * 100)}%`}
                icon={DollarSign}
                variant="purple"
              />
            </div>

            {/* 7-Day Trend Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Next 7 Days Daily Revenue Forecast</h3>
                  <ConfidenceIndicator confidence={0.88} />
                </div>
                <ExportToolbar data={sevenDayGraphData} fileName="sales-forecast-7days" title="Next 7 Days Sales Forecast" />
              </div>
              <TrendGraph type="area" data={sevenDayGraphData} xKey="date" height={260} />
            </div>

            {/* 30-Day Projection Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">30-Day Monthly Trend Projection</h3>
                  <ConfidenceIndicator confidence={forecast.overall_confidence} />
                </div>
                <ExportToolbar data={thirtyDayGraphData} fileName="sales-forecast-30days" title="Next 30 Days Sales Forecast" />
              </div>
              <TrendGraph type="line" data={thirtyDayGraphData} xKey="date" height={260} />
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
