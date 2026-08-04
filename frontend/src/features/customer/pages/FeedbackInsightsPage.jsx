import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Star,
  Smile,
  Meh,
  Frown,
  Utensils,
  Award,
  Users,
  AlertCircle,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '../api/customer.api';

export default function FeedbackInsightsPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAggregateData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await customerApi.listFeedback(restaurantId, { aggregate: 'true' });
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load feedback analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadAggregateData();
  }, [loadAggregateData]);

  const ratingDist = stats?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sentimentBreak = stats?.sentimentBreakdown || { Positive: 0, Neutral: 0, Negative: 0 };
  const total = stats?.totalFeedback || 0;

  const getPercent = (val) => (total > 0 ? Math.round((val / total) * 100) : 0);

  return (
    <RestaurantLayout
      title="Customer Feedback & Sentiment Insights"
      description="Executive analytics on guest satisfaction trends, star distributions, and service quality."
    >
      {isLoading ? (
        <Loader label="Loading executive feedback insights..." />
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Star size={24} className="fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Average Star Rating</p>
                  <p className="text-2xl font-bold font-display text-foreground">{stats?.averageRating?.toFixed(1) || '0.0'} / 5.0</p>
                  <p className="text-[10px] text-muted-foreground">Based on {total} diner reviews</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                  <Utensils size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Food Quality Rating</p>
                  <p className="text-2xl font-bold font-display text-foreground">{stats?.averageFoodRating?.toFixed(1) || '0.0'} / 5.0</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Cuisine & Menu Taste</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Service Rating</p>
                  <p className="text-2xl font-bold font-display text-foreground">{stats?.averageServiceRating?.toFixed(1) || '0.0'} / 5.0</p>
                  <p className="text-[10px] text-blue-600 font-semibold">Speed & Order Accuracy</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 shrink-0">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Staff Courtesy</p>
                  <p className="text-2xl font-bold font-display text-foreground">{stats?.averageStaffRating?.toFixed(1) || '0.0'} / 5.0</p>
                  <p className="text-[10px] text-purple-600 font-semibold">Hospitality & Care</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Section: Rating Distribution & Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-500 fill-amber-500" />
                  <div>
                    <CardTitle className="text-base">Rating Distribution</CardTitle>
                    <CardDescription className="text-xs">Breakdown of star ratings submitted by guests.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDist[star] || 0;
                  const pct = getPercent(count);
                  return (
                    <div key={star} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1">
                          {star} <Star size={12} className="fill-amber-500 text-amber-500" />
                        </span>
                        <span>{count} reviews ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Sentiment Breakdown */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  <div>
                    <CardTitle className="text-base">AI Sentiment Breakdown</CardTitle>
                    <CardDescription className="text-xs">Natural language processing sentiment analysis.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <Smile size={24} className="mx-auto text-emerald-600 mb-1" />
                    <p className="text-lg font-bold text-emerald-700 font-display">{sentimentBreak.Positive || 0}</p>
                    <p className="text-xs text-emerald-600 font-semibold">Positive</p>
                  </div>

                  <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-4">
                    <Meh size={24} className="mx-auto text-slate-600 mb-1" />
                    <p className="text-lg font-bold text-slate-700 font-display">{sentimentBreak.Neutral || 0}</p>
                    <p className="text-xs text-slate-600 font-semibold">Neutral</p>
                  </div>

                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                    <Frown size={24} className="mx-auto text-rose-600 mb-1" />
                    <p className="text-lg font-bold text-rose-700 font-display">{sentimentBreak.Negative || 0}</p>
                    <p className="text-xs text-rose-600 font-semibold">Negative</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Overall Satisfaction Score</span>
                    <span className="font-bold text-emerald-600">{getPercent((sentimentBreak.Positive || 0) + (sentimentBreak.Neutral || 0))}% Positive / Neutral</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${getPercent(sentimentBreak.Positive || 0)}%` }}
                    />
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${getPercent(sentimentBreak.Neutral || 0)}%` }}
                    />
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${getPercent(sentimentBreak.Negative || 0)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
