import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Star, Sun, AlertCircle, Lightbulb } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import RecommendationCard from '../components/RecommendationCard';
import AiInsightCard from '../components/AiInsightCard';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import * as aiApi from '../api/ai.api';

export default function AiRecommendationsPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [menu, setMenu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.getSmartMenuRecommendations(restaurantId);
      setMenu(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load smart menu recommendations.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <RestaurantLayout title="Smart Menu Recommendations" description="AI optimization categorizing best selling, seasonal, and low performing menu items.">
      <div className="space-y-8 max-w-full">
        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && menu && (
          <>
            {/* Actionable Suggestions Callouts */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="text-amber-500" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Actionable AI Menu Suggestions</h3>
                <ConfidenceIndicator confidence={0.92} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(menu.actionable_suggestions || []).map((tip, idx) => (
                  <AiInsightCard
                    key={idx}
                    category="Menu Strategy"
                    title={`Recommendation #${idx + 1}`}
                    description={tip}
                  />
                ))}
              </div>
            </div>

            {/* Best Sellers */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="text-amber-500" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Best Selling Stars</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(menu.best_selling_items || []).map((item, idx) => (
                  <RecommendationCard
                    key={idx}
                    itemName={item.item_name}
                    category={item.category}
                    reason={`Revenue: ₹${item.total_revenue?.toLocaleString('en-IN')} | Orders: ${item.total_qty}`}
                    badgeText={item.recommendation_tag}
                    badgeColor="bg-amber-100 text-amber-800"
                  />
                ))}
              </div>
            </div>

            {/* Seasonal Highlights */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sun className="text-sky-500" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Seasonal Favorites</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(menu.seasonal_items || []).map((item, idx) => (
                  <RecommendationCard
                    key={idx}
                    itemName={item.item_name}
                    category={item.category}
                    reason={`Revenue: ₹${item.total_revenue?.toLocaleString('en-IN')} | Margin: ${item.profit_margin}%`}
                    badgeText={item.recommendation_tag}
                    badgeColor="bg-sky-100 text-sky-800"
                  />
                ))}
              </div>
            </div>

            {/* Low Performing */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-rose-500" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Underperforming Items (Review Needed)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(menu.low_performing_items || []).map((item, idx) => (
                  <RecommendationCard
                    key={idx}
                    itemName={item.item_name}
                    category={item.category}
                    reason={`Low demand: only ${item.total_qty} orders in last 30 days`}
                    badgeText={item.recommendation_tag}
                    badgeColor="bg-rose-100 text-rose-800"
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
