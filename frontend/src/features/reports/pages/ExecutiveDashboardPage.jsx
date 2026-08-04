import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, ShoppingBag, Users, CalendarCheck,
  AlertTriangle, UserCheck, Star, Package, TrendingUp, Calendar,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import KpiCard from '../components/KpiCard';
import ChartWidget from '../components/ChartWidget';
import { Button } from '@/components/ui/button';
import * as reportsApi from '../api/reports.api';

export default function ExecutiveDashboardPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Revenue Breakdown State (Daily, Monthly, Yearly)
  const [revenueGroupBy, setRevenueGroupBy] = useState('day');
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [isRevenueLoading, setIsRevenueLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
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

  const loadRevenueData = useCallback(async (groupBy) => {
    if (!restaurantId) return;
    setIsRevenueLoading(true);
    try {
      const now = new Date();
      let startDate;

      if (groupBy === 'day') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (groupBy === 'month') {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      } else if (groupBy === 'year') {
        startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
      }

      const summary = await reportsApi.getSalesSummary(restaurantId, {
        startDate,
        endDate: now.toISOString(),
        groupBy,
      });
      setRevenueSummary(summary);
    } catch (err) {
      console.error('Failed to load revenue summary:', err);
    } finally {
      setIsRevenueLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadRevenueData(revenueGroupBy);
  }, [loadRevenueData, revenueGroupBy]);

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

  const timelineChartData = (revenueSummary?.timeline || []).map((item) => ({
    _id: item._id,
    revenue: Number((item.revenue || 0).toFixed(2)),
    orders: item.orders || 0,
    avgTicket: Number((item.avgTicket || 0).toFixed(2)),
  }));

  const revenueTotals = revenueSummary?.totals?.[0] || { totalRevenue: 0, totalOrders: 0, avgTicket: 0 };

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

            {/* OWNER REVENUE BREAKDOWN SECTION */}
            <section className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Revenue & Order Breakdown</h2>
                    <p className="text-xs text-muted-foreground">Historical revenue performance aggregated by custom timeline frames.</p>
                  </div>
                </div>

                {/* Daily, Monthly, Yearly Tabs */}
                <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl">
                  <Button
                    size="xs"
                    variant={revenueGroupBy === 'day' ? 'default' : 'ghost'}
                    onClick={() => setRevenueGroupBy('day')}
                    className="text-xs font-semibold px-3"
                  >
                    Daily (30 Days)
                  </Button>
                  <Button
                    size="xs"
                    variant={revenueGroupBy === 'month' ? 'default' : 'ghost'}
                    onClick={() => setRevenueGroupBy('month')}
                    className="text-xs font-semibold px-3"
                  >
                    Monthly (12 Months)
                  </Button>
                  <Button
                    size="xs"
                    variant={revenueGroupBy === 'year' ? 'default' : 'ghost'}
                    onClick={() => setRevenueGroupBy('year')}
                    className="text-xs font-semibold px-3"
                  >
                    Yearly (5 Years)
                  </Button>
                </div>
              </div>

              {/* Period Totals Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-muted/40 border border-border rounded-lg p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Period Revenue</p>
                  <p className="text-xl font-bold font-display text-emerald-600 mt-1">
                    ₹{revenueTotals.totalRevenue ? revenueTotals.totalRevenue.toLocaleString() : '0.00'}
                  </p>
                </div>
                <div className="bg-muted/40 border border-border rounded-lg p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Period Total Orders</p>
                  <p className="text-xl font-bold font-display text-sky-600 mt-1">
                    {revenueTotals.totalOrders || 0} orders
                  </p>
                </div>
                <div className="bg-muted/40 border border-border rounded-lg p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Avg Ticket / Order Value</p>
                  <p className="text-xl font-bold font-display text-amber-600 mt-1">
                    ₹{revenueTotals.avgTicket ? Number(revenueTotals.avgTicket).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Timeline Chart */}
              {isRevenueLoading ? (
                <Loader label="Computing revenue timeline data..." />
              ) : (
                <ChartWidget
                  type="area"
                  data={timelineChartData}
                  xKey="_id"
                  dataKeys={[
                    { key: 'revenue', label: 'Revenue (₹)', color: '#82b34e' },
                    { key: 'orders', label: 'Order Count', color: '#4a90d9' },
                    { key: 'avgTicket', label: 'Avg Ticket (₹)', color: '#f5a623' },
                  ]}
                  height={280}
                  emptyLabel={`No revenue records found for the ${revenueGroupBy} breakdown selection.`}
                />
              )}
            </section>

            {/* Top Selling Items & Inventory Alerts */}
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
