import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, PieChart as PieIcon, Star } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import ChartWidget from '@/features/reports/components/ChartWidget';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import ExportToolbar from '@/features/reports/components/ExportToolbar';
import * as aiApi from '../api/ai.api';

export default function DemandPredictionPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [demand, setDemand] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.getDemandForecast(restaurantId);
      setDemand(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load demand predictions.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const hourlyChartData = (demand?.busy_hours || []).map((h) => ({
    hour: `${h.hour}:00`,
    order_volume: h.order_volume,
  }));

  const dailyChartData = (demand?.busy_days || []).map((d) => ({
    day: d.day,
    order_volume: d.order_volume,
  }));

  return (
    <RestaurantLayout title="Demand Prediction & Peak Analytics" description="AI predictions for busy hours, peak days, popular categories, and menu item demand.">
      <div className="space-y-8 max-w-full">
        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && demand && (
          <>
            {/* Hourly Demand Bar Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Clock className="text-primary" size={18} />
                  <h3 className="text-sm font-semibold text-foreground">Predicted Peak Hourly Traffic</h3>
                  <ConfidenceIndicator confidence={0.89} />
                </div>
                <ExportToolbar data={hourlyChartData} fileName="hourly-demand-forecast" title="Hourly Demand Forecast" />
              </div>
              <ChartWidget
                type="bar"
                data={hourlyChartData}
                xKey="hour"
                dataKeys={[{ key: 'order_volume', label: 'Predicted Order Volume', color: '#c2440f' }]}
                height={260}
              />
            </div>

            {/* Daily Demand & Category Popularity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-emerald-600" size={18} />
                    <h3 className="text-sm font-semibold text-foreground">Predicted Daily Demand Volume</h3>
                  </div>
                </div>
                <ChartWidget
                  type="bar"
                  data={dailyChartData}
                  xKey="day"
                  dataKeys={[{ key: 'order_volume', label: 'Order Volume', color: '#82b34e' }]}
                  height={240}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <PieIcon className="text-purple-600" size={18} />
                  <h3 className="text-sm font-semibold text-foreground">Popular Category Share</h3>
                </div>
                <ChartWidget
                  type="donut"
                  data={(demand.popular_categories || []).map((c) => ({ name: c.category_name, share: c.share_percentage }))}
                  nameKey="name"
                  valueKey="share"
                  height={240}
                />
              </div>
            </div>

            {/* Popular Items Table */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="text-amber-500" size={18} />
                <h3 className="text-sm font-semibold text-foreground">Predicted High-Demand Menu Items</h3>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Item Name</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Projected Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(demand.popular_menu_items || []).map((item, idx) => (
                      <tr key={idx} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.item_name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">{item.orders_count} orders</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
