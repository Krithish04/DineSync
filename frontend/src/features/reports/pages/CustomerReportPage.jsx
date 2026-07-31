import { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, Award, Star } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import KpiCard from '../components/KpiCard';
import ChartWidget from '../components/ChartWidget';
import ReportFilters from '../components/ReportFilters';
import ExportToolbar from '../components/ExportToolbar';
import * as reportsApi from '../api/reports.api';

const today = new Date();
const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const defaultEnd = today.toISOString().slice(0, 10);

export default function CustomerReportPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [filters, setFilters] = useState({ startDate: defaultStart, endDate: defaultEnd });
  const [customerData, setCustomerData] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    const params = { startDate: filters.startDate, endDate: filters.endDate };
    try {
      const [custRes, loyRes] = await Promise.all([
        reportsApi.getCustomerSummary(restaurantId, params),
        reportsApi.getCustomerLoyaltySummary(restaurantId, params),
      ]);
      setCustomerData(custRes);
      setLoyaltyData(loyRes);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const tierData = (customerData?.tierBreakdown || []).map((t) => ({
    name: t._id,
    count: t.count,
    totalSpent: t.totalSpent,
  }));

  const topCustomersExport = (customerData?.topCustomers || []).map((c) => ({
    Name: c.fullName,
    Phone: c.phoneNumber,
    'Total Spent (₹)': c.totalSpent,
    Visits: c.visitCount,
    'Loyalty Points': c.loyaltyPoints,
    Tier: c.membershipTier,
  }));

  return (
    <RestaurantLayout title="Customer Reports" description="Customer acquisition, loyalty, and retention analytics.">
      <div className="space-y-6 max-w-full">
        <ReportFilters filters={filters} onChange={setFilters} />

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && customerData && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="New Customers" value={customerData.newCustomers} icon={Users} colorClass="text-primary" bgClass="bg-primary/10" />
              <KpiCard title="Returning Customers" value={customerData.returningCustomers} icon={UserCheck} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
              <KpiCard title="Points Earned" value={loyaltyData?.pointsEarned || 0} icon={Award} colorClass="text-amber-600" bgClass="bg-amber-50" />
              <KpiCard title="Points Redeemed" value={loyaltyData?.pointsRedeemed || 0} icon={Star} colorClass="text-purple-600" bgClass="bg-purple-50" />
            </div>

            {/* Tier Breakdown + Loyalty */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Customers by Membership Tier</h2>
                <ChartWidget
                  type="donut"
                  data={tierData}
                  nameKey="name"
                  valueKey="count"
                  height={260}
                  emptyLabel="No tier data available."
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Loyalty Program Summary</h2>
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  {[
                    { label: 'Points Earned', value: loyaltyData?.pointsEarned || 0, color: 'text-emerald-600' },
                    { label: 'Earning Transactions', value: loyaltyData?.earningTransactions || 0, color: 'text-sky-600' },
                    { label: 'Points Redeemed', value: loyaltyData?.pointsRedeemed || 0, color: 'text-rose-600' },
                    { label: 'Redemption Transactions', value: loyaltyData?.redemptionTransactions || 0, color: 'text-amber-600' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`text-lg font-bold font-display ${item.color}`}>
                        {item.value.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Customers Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Top Customers by Spend</h2>
                <ExportToolbar data={topCustomersExport} fileName="top-customers" title="Top Customers" />
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Customer</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Visits</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total Spent</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Points</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customerData.topCustomers || []).length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No customer data yet.</td></tr>
                    ) : customerData.topCustomers.map((c, i) => (
                      <tr key={c._id || i} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.fullName}</p>
                          <p className="text-xs text-muted-foreground">{c.phoneNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-right">{c.visitCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">₹{c.totalSpent?.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right">{c.loyaltyPoints}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.membershipTier === 'Platinum' ? 'bg-purple-100 text-purple-700' :
                            c.membershipTier === 'Gold' ? 'bg-amber-100 text-amber-700' :
                            c.membershipTier === 'Silver' ? 'bg-gray-100 text-gray-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {c.membershipTier}
                          </span>
                        </td>
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
