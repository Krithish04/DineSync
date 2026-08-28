import { useState, useEffect, useCallback } from 'react';
import { Sparkles, DollarSign, TrendingUp, AlertTriangle, Star, Clock, Heart, ShoppingBag } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import ForecastCard from '../components/ForecastCard';
import AiInsightCard from '../components/AiInsightCard';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import ModelSourceBadge from '../components/ModelSourceBadge';
import * as aiApi from '../api/ai.api';

export default function AiDashboardPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.getAiDashboardOverview(restaurantId);
      setOverview(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load AI overview metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  return (
    <RestaurantLayout
      title="AI & Predictive Intelligence"
      description="Real-time predictive insights, sales forecasts, demand models, and smart menu optimization."
    >
      <div className="space-y-8 max-w-full">
        {isLoading && <Loader />}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && overview && (
          <>
            {/* Top AI Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ForecastCard
                title="Predicted Revenue (Tomorrow)"
                value={overview.salesForecastTomorrow?.predicted_revenue}
                prefix="₹"
                icon={DollarSign}
                confidence={overview.salesForecastTomorrow?.confidence_score}
                variant="primary"
              />
              <ForecastCard
                title="Predicted Table Wait"
                value={overview.estimatedWaitTime}
                suffix=" mins"
                icon={Clock}
                variant="amber"
              />
              <ForecastCard
                title="Sentiment Score"
                value={overview.sentimentScore}
                suffix=" / 10"
                subtitle={overview.overallSentiment}
                icon={Heart}
                variant="emerald"
              />
              <ForecastCard
                title="Inventory Reorder Alerts"
                value={overview.inventoryAlertsCount}
                subtitle="Low stock items"
                icon={AlertTriangle}
                variant="purple"
              />
            </div>

            {/* AI Callouts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AiInsightCard
                category="Demand Prediction"
                title="Busy Peak Hours Expected"
                description={overview.demandSummary?.busyHoursCount > 0
                  ? `Peak demand projected from historical order velocity. Top category: ${overview.demandSummary?.topCategory || 'Main Course'}.`
                  : `Steady order demand projected across operating hours. Top category: ${overview.demandSummary?.topCategory || 'Main Course'}.`}
              />
              <AiInsightCard
                category="Smart Menu Optimization"
                title="Top Menu Star"
                description={`'${overview.topMenuItem || 'Featured Item'}' is generating highest customer margins and order frequency.`}
              />
              <AiInsightCard
                category="Customer Cross-Sell"
                title={overview.topRecommendation?.item_name || 'Combo Upsell'}
                description={overview.topRecommendation?.reason || `Frequently ordered together with ${overview.topMenuItem || 'top items'}.`}
              />
            </div>

            {/* AI Platform Capabilities Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Sparkles className="text-primary" size={20} />
                  <h3 className="text-base font-bold font-display text-foreground">DineSync AI Predictive Platform</h3>
                  <ModelSourceBadge mode={overview.salesForecastTomorrow?.execution_mode || 'AI_LIVE_MODEL'} />
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Real-time intelligence algorithms are actively analyzing your order volume, kitchen preparation velocity, customer feedback, and stock consumption rates to optimize operational throughput.
                </p>
              </div>
              <ConfidenceIndicator confidence={overview.salesForecastTomorrow?.confidence_score || 0.88} label="Prediction Accuracy" />
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
