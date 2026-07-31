import { useState, useEffect, useCallback } from 'react';
import { Heart, ThumbsUp, ThumbsDown, MessageSquare, Star } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import ForecastCard from '../components/ForecastCard';
import ChartWidget from '@/features/reports/components/ChartWidget';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import * as aiApi from '../api/ai.api';

export default function SentimentDashboardPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [sentiment, setSentiment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.getSentimentAnalysis(restaurantId);
      setSentiment(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sentiment analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const sentimentChartData = sentiment ? [
    { name: 'Positive', count: sentiment.positive_count },
    { name: 'Neutral', count: sentiment.neutral_count },
    { name: 'Negative', count: sentiment.negative_count },
  ] : [];

  return (
    <RestaurantLayout title="Customer Sentiment Dashboard" description="Natural language processing and sentiment analysis of diner reviews, ratings, and feedback.">
      <div className="space-y-8 max-w-full">
        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && sentiment && (
          <>
            {/* Sentiment KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ForecastCard
                title="Overall Sentiment Score"
                value={sentiment.sentiment_score}
                suffix=" / 10"
                subtitle={sentiment.overall_sentiment}
                icon={Heart}
                confidence={0.93}
                variant="emerald"
              />
              <ForecastCard
                title="Positive Sentiment Rate"
                value={sentiment.positive_percentage}
                suffix="%"
                icon={ThumbsUp}
                confidence={0.91}
                variant="primary"
              />
              <ForecastCard
                title="Total Positive Reviews"
                value={sentiment.positive_count}
                icon={Star}
                variant="default"
              />
              <ForecastCard
                title="Total Critical Reviews"
                value={sentiment.negative_count}
                icon={ThumbsDown}
                variant="amber"
              />
            </div>

            {/* Sentiment Distribution & Key Themes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="text-primary" size={18} />
                  <h3 className="text-sm font-semibold text-foreground">Review Sentiment Breakdown</h3>
                  <ConfidenceIndicator confidence={0.91} />
                </div>
                <ChartWidget
                  type="donut"
                  data={sentimentChartData}
                  nameKey="name"
                  valueKey="count"
                  height={240}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Key Customer Sentiment Themes</h3>
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  {(sentiment.key_themes || []).map((theme, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-border pb-2.5 last:border-0 last:pb-0">
                      <span className="text-sm font-medium text-foreground">{theme}</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        High Rating
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
