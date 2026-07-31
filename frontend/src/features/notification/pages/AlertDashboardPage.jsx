import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, AlertTriangle, Clock } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import AlertCard from '../components/AlertCard';
import ScheduledJobsMonitor from '../components/ScheduledJobsMonitor';
import * as notificationApi from '../api/notification.api';

export default function AlertDashboardPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const data = await notificationApi.listNotifications(restaurantId, { priority: 'Critical', limit: 20 });
      setCriticalAlerts(data.notifications || []);
    } catch { /* non-fatal */ } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <RestaurantLayout title="Alert Dashboard & Automation Monitor" description="High-priority system alerts, security warnings, and background cron runner monitoring.">
      <div className="space-y-6 max-w-full">
        {/* Background Jobs Execution Monitor */}
        <ScheduledJobsMonitor />

        {/* Critical Workspace Alerts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-500" />
            <h3 className="text-sm font-bold font-display text-foreground">Critical Workspace Warnings ({criticalAlerts.length})</h3>
          </div>

          {isLoading ? (
            <Loader />
          ) : criticalAlerts.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-5 text-center text-xs font-semibold">
              ✓ Zero critical alerts requiring immediate resolution.
            </div>
          ) : (
            criticalAlerts.map((notif) => (
              <AlertCard key={notif._id} alert={notif} onRefresh={loadData} />
            ))
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}
