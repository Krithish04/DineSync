import { useState, useEffect, useCallback } from 'react';
import { Users, Sparkles, ShoppingBag, ArrowRightLeft, TrendingUp } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import RecommendationCard from '../components/RecommendationCard';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import * as aiApi from '../api/ai.api';

export default function CustomerInsightsPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.getCustomerRecommendations(restaurantId);
      setRecommendations(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer recommendations.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <RestaurantLayout title="Customer Insights & Recommendations" description="Frequently bought together, cross-sell, upsell, and personalized menu recommendations.">
      <div className="space-y-8 max-w-full">
        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && recommendations && (
          <>
            {/* Frequently Bought Together */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ArrowRightLeft className="text-primary" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Frequently Bought Together Pairs</h3>
                <ConfidenceIndicator confidence={0.88} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(recommendations.frequently_bought_together || []).map((pair, idx) => (
                  <RecommendationCard
                    key={idx}
                    itemName={`${pair.item_a} + ${pair.item_b}`}
                    reason={`Co-ordered in ${pair.co_occurrence_count} past order tickets`}
                    score={pair.confidence}
                    badgeText="Popular Pair"
                  />
                ))}
              </div>
            </div>

            {/* Cross-Sell Recommendations */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ShoppingBag className="text-emerald-600" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Cross-Sell Add-On Suggestions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(recommendations.cross_sell_recommendations || []).map((item, idx) => (
                  <RecommendationCard
                    key={idx}
                    itemName={item.item_name}
                    reason={item.reason}
                    score={item.score}
                    badgeText="Cross-Sell"
                    badgeColor="bg-emerald-100 text-emerald-700"
                  />
                ))}
              </div>
            </div>

            {/* Upsell Recommendations */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-purple-600" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Premium Upsell Opportunities</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(recommendations.upsell_recommendations || []).map((item, idx) => (
                  <RecommendationCard
                    key={idx}
                    itemName={item.item_name}
                    reason={item.reason}
                    score={item.score}
                    badgeText="Upsell Upgrade"
                    badgeColor="bg-purple-100 text-purple-700"
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
