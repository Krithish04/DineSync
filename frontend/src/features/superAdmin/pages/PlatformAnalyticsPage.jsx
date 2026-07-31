import { useState, useEffect } from 'react';
import { LineChart, BarChart, Users, Activity, TrendingUp } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import ChartWidget from '@/features/reports/components/ChartWidget';
import ForecastCard from '@/features/ai/components/ForecastCard';

const USER_GROWTH_DATA = [
  { month: 'Jan', tenants: 4, users: 28 },
  { month: 'Feb', tenants: 8, users: 64 },
  { month: 'Mar', tenants: 15, users: 140 },
  { month: 'Apr', tenants: 24, users: 245 },
];

const API_TRAFFIC_DATA = [
  { hour: '08:00', requests: 1200 },
  { hour: '12:00', requests: 4800 },
  { hour: '16:00', requests: 2900 },
  { hour: '20:00', requests: 6500 },
  { hour: '00:00', requests: 1100 },
];

export default function PlatformAnalyticsPage() {
  return (
    <SuperAdminLayout title="Platform Analytics & Performance" description="Multi-tenant user growth, API traffic volume, and platform performance trends.">
      <div className="space-y-6 max-w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ForecastCard title="Tenant Acquisition Rate" value="+40%" subtitle="MoM Growth" icon={TrendingUp} variant="emerald" />
          <ForecastCard title="Daily Active Users" value={180} subtitle="73% engagement" icon={Users} variant="primary" />
          <ForecastCard title="API Requests Today" value="16.5k" subtitle="Avg latency: 42ms" icon={Activity} variant="purple" />
          <ForecastCard title="Platform Uptime SLA" value="99.98%" subtitle="Zero unscheduled downtime" icon={LineChart} variant="amber" />
        </div>

        {/* User & Tenant Growth Chart */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">SaaS Tenant & User Account Growth</h3>
          <ChartWidget
            type="bar"
            data={USER_GROWTH_DATA}
            xKey="month"
            dataKeys={[
              { key: 'tenants', label: 'Active Tenant Restaurants', color: '#c2440f' },
              { key: 'users', label: 'Registered Staff Accounts', color: '#059669' },
            ]}
            height={260}
          />
        </div>

        {/* API Traffic Volume Chart */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">API Traffic Volume (24h Window)</h3>
          <ChartWidget
            type="area"
            data={API_TRAFFIC_DATA}
            xKey="hour"
            dataKeys={[{ key: 'requests', label: 'API Requests / Hour', color: '#7c3aed' }]}
            height={220}
          />
        </div>
      </div>
    </SuperAdminLayout>
  );
}
