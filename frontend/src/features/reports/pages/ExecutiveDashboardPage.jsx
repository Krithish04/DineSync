import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, ShoppingBag, Users, CalendarCheck,
  AlertTriangle, UserCheck, Star, Package,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import KpiCard from '../components/KpiCard';
import ChartWidget from '../components/ChartWidget';
import * as reportsApi from '../api/reports.api';

export default function ExecutiveDashboardPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await reportsApi.getExecutiveDashboard(restaurantId);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    {
      title: 'Revenue Today',
      value: data.revenueToday,
      prefix: '₹',
      icon: DollarSign,
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      title: 'Revenue This Month',
      value: data.revenueThisMonth,
      prefix: '₹',
      icon: DollarSign,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      title: 'Orders Today',
      value: data.ordersToday,
      icon: ShoppingBag,
      colorClass: 'text-sky-600',
      bgClass: 'bg-sky-50',
    },
    {
      title: 'Active Tables',
      value: data.activeTables,
      icon: Package,
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
    },
    {
      title: 'Reservations Today',
      value: data.reservationsToday,
      icon: CalendarCheck,
      colorClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
    },
    {
      title: 'Staff Present Today',
      value: data.employeesPresentToday,
      icon: UserCheck,
      colorClass: 'text-teal-600',
      bgClass: 'bg-teal-50',
    },
  ] : [];

  const topItemsData = (data?.topSellingItems || []).map((i) => ({
    name: i.itemName,
    qty: i.totalQty,
    revenue: i.totalRevenue,
  }));

  const lowStockData = data?.inventoryAlerts || [];

  return (
    <RestaurantLayout
      title="Executive Dashboard"
      description="Real-time business intelligence and key performance indicators."
    >
      <div className="space-y-8 max-w-full">
        {isLoading && <Loader />}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* KPI Grid */}
            <section>
              <h2 className="text-base font-semibold text-foreground mb-4">Today at a Glance</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpis.map((kpi) => (
                  <KpiCard key={kpi.title} {...kpi} />
                ))}
              </div>
            </section>

            {/* Top Selling Items */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star size={16} className="text-amber-500" />
                  <h2 className="text-base font-semibold text-foreground">Top Selling Items (Last 30 Days)</h2>
                </div>
                <ChartWidget
                  type="bar"
                  data={topItemsData}
                  xKey="name"
                  dataKeys={[
                    { key: 'qty', label: 'Units Sold', color: '#c2440f' },
                    { key: 'revenue', label: 'Revenue (₹)', color: '#82b34e' },
                  ]}
                  height={240}
                  emptyLabel="No completed orders in the last 30 days."
                />
              </div>

              {/* Low Stock Alerts */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-rose-500" />
                  <h2 className="text-base font-semibold text-foreground">
                    Low / Out-of-Stock Alerts
                    {lowStockData.length > 0 && (
                      <span className="ml-2 text-xs bg-rose-100 text-rose-600 font-semibold px-2 py-0.5 rounded-full">
                        {lowStockData.length}
                      </span>
                    )}
                  </h2>
                </div>
                {lowStockData.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-700 text-sm font-medium">
                    ✓ All ingredients are above reorder levels
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ingredient</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Current</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Reorder At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockData.map((item, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{item.ingredientName}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold ${item.currentStock <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                              {item.currentStock} {item.unit}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {item.reorderLevel} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
