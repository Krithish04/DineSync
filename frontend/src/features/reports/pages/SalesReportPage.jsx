import { useState, useEffect, useCallback } from 'react';
import { DollarSign, ShoppingCart, Tag, Clock } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import KpiCard from '../components/KpiCard';
import ChartWidget from '../components/ChartWidget';
import ReportFilters from '../components/ReportFilters';
import ExportToolbar from '../components/ExportToolbar';
import * as reportsApi from '../api/reports.api';
import * as branchApi from '@/features/branch/api/branch.api';

const today = new Date();
const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const defaultEnd = today.toISOString().slice(0, 10);

export default function SalesReportPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [filters, setFilters] = useState({ startDate: defaultStart, endDate: defaultEnd, groupBy: 'day' });
  const [branches, setBranches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byItem, setByItem] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch { /* non-fatal */ }
  }, [restaurantId]);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    const params = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      branch: filters.branch || undefined,
      groupBy: filters.groupBy,
    };
    try {
      const [summaryRes, catRes, itemRes, hourlyRes] = await Promise.all([
        reportsApi.getSalesSummary(restaurantId, params),
        reportsApi.getSalesByCategory(restaurantId, params),
        reportsApi.getSalesByItem(restaurantId, { ...params, limit: 10 }),
        reportsApi.getHourlySales(restaurantId, params),
      ]);
      setSummary(summaryRes);
      setByCategory(catRes || []);
      setByItem(itemRes || []);
      setHourly(hourlyRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, filters]);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadData(); }, [loadData]);

  const timelineData = (summary?.timeline || []).map((r) => ({
    date: r._id,
    revenue: r.revenue,
    orders: r.orders,
    avgTicket: Math.round((r.avgTicket || 0) * 100) / 100,
  }));

  const catData = byCategory.map((c) => ({
    name: c.categoryName || 'Unknown',
    revenue: c.totalRevenue,
    qty: c.totalQty,
  }));

  const itemTableData = byItem.map((i) => ({
    Item: i.itemName,
    'Units Sold': i.totalQty,
    'Revenue (₹)': i.totalRevenue?.toFixed(2),
    'Avg Price (₹)': i.avgPrice?.toFixed(2),
  }));

  const hourlyData = hourly.map((h) => ({ hour: `${h.hour}:00`, revenue: h.revenue, orders: h.orders }));

  return (
    <RestaurantLayout title="Sales Reports" description="Detailed revenue, order, and product analytics.">
      <div className="space-y-6 max-w-full">
        {/* Filters */}
        <ReportFilters
          filters={filters}
          onChange={setFilters}
          branches={branches}
          showGroupBy
        />

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && summary && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Total Revenue" value={summary.totals?.totalRevenue} prefix="₹" icon={DollarSign} colorClass="text-primary" bgClass="bg-primary/10" />
              <KpiCard title="Total Orders" value={summary.totals?.totalOrders} icon={ShoppingCart} colorClass="text-sky-600" bgClass="bg-sky-50" />
              <KpiCard title="Avg Ticket Size" value={Math.round((summary.totals?.avgTicket || 0) * 100) / 100} prefix="₹" icon={Tag} colorClass="text-amber-600" bgClass="bg-amber-50" />
              <KpiCard title="Tax Collected" value={Math.round((summary.totals?.totalTax || 0) * 100) / 100} prefix="₹" icon={DollarSign} colorClass="text-purple-600" bgClass="bg-purple-50" />
            </div>

            {/* Revenue Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Revenue Timeline</h2>
                <ExportToolbar data={timelineData} fileName="sales-timeline" title="Sales Revenue Timeline" />
              </div>
              <ChartWidget
                type="area"
                data={timelineData}
                xKey="date"
                dataKeys={[
                  { key: 'revenue', label: 'Revenue (₹)', color: '#c2440f' },
                  { key: 'orders', label: 'Orders', color: '#82b34e' },
                ]}
                height={280}
              />
            </div>

            {/* Sales by Category + Hourly */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Revenue by Category</h2>
                <ChartWidget
                  type="donut"
                  data={catData}
                  nameKey="name"
                  valueKey="revenue"
                  height={260}
                  emptyLabel="No category data found."
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Hourly Sales Distribution</h2>
                <ChartWidget
                  type="bar"
                  data={hourlyData}
                  xKey="hour"
                  dataKeys={[{ key: 'revenue', label: 'Revenue (₹)', color: '#c2440f' }]}
                  height={260}
                  emptyLabel="No hourly data found."
                />
              </div>
            </div>

            {/* Top Items Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Top 10 Items by Revenue</h2>
                <ExportToolbar data={itemTableData} fileName="top-items" title="Top Items by Revenue" />
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Item</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Units Sold</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byItem.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No item data for the selected period.</td></tr>
                    ) : byItem.map((item, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-right">{item.totalQty}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">₹{item.totalRevenue?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">₹{item.avgPrice?.toFixed(2)}</td>
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
