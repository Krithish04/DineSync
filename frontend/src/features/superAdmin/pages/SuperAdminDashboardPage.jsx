import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Building2, Users, HardDrive, TrendingUp, ShieldCheck } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import ForecastCard from '@/features/ai/components/ForecastCard';
import ChartWidget from '@/features/reports/components/ChartWidget';
import * as superAdminApi from '../api/superAdmin.api';

const MRR_TREND_DATA = [
  { month: 'Jan', mrr: 12000, arr: 144000 },
  { month: 'Feb', mrr: 16500, arr: 198000 },
  { month: 'Mar', mrr: 24000, arr: 288000 },
  { month: 'Apr', mrr: 38000, arr: 456000 },
];

export default function SuperAdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await superAdminApi.getPlatformOverview();
      setOverview(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load platform metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <SuperAdminLayout title="SaaS Platform Executive Dashboard" description="MRR/ARR revenue metrics, tenant subscription overview, and system health status.">
      <div className="space-y-6 max-w-full">
        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && overview && (
          <>
            {/* Top SaaS KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ForecastCard
                title="Monthly Recurring (MRR)"
                value={overview.mrr}
                prefix="₹"
                icon={DollarSign}
                subtitle={`ARR: ₹${overview.arr?.toLocaleString('en-IN')}`}
                variant="primary"
              />
              <ForecastCard
                title="Active Tenant Restaurants"
                value={overview.activeTenants}
                subtitle={`${overview.totalTenants} total registered`}
                icon={Building2}
                variant="emerald"
              />
              <ForecastCard
                title="Total Platform Users"
                value={overview.totalUsers}
                subtitle="Active Staff Accounts"
                icon={Users}
                variant="purple"
              />
              <ForecastCard
                title="Est. Platform Storage"
                value={overview.estimatedStorageMb}
                suffix=" MB"
                subtitle="MongoDB & Assets"
                icon={HardDrive}
                variant="amber"
              />
            </div>

            {/* MRR Revenue Chart */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">SaaS Platform MRR Growth Trend</h3>
              <ChartWidget
                type="area"
                data={MRR_TREND_DATA}
                xKey="month"
                dataKeys={[{ key: 'mrr', label: 'Monthly Recurring Revenue (₹)', color: '#c2440f' }]}
                height={260}
              />
            </div>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
