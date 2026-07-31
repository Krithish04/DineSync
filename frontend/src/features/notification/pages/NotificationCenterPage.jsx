import { useState, useEffect, useCallback } from 'react';
import { Bell, Filter, Check, Trash2, Archive, ShieldAlert } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import AlertCard from '../components/AlertCard';
import * as notificationApi from '../api/notification.api';

export default function NotificationCenterPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await notificationApi.listNotifications(restaurantId, {
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        limit: 100,
      });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, priorityFilter, categoryFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead(restaurantId);
      loadData();
    } catch { /* non-fatal */ }
  };

  return (
    <RestaurantLayout title="Alert Center & Notifications" description="Centralized workspace notifications, critical alerts, and event logs.">
      <div className="space-y-6 max-w-full">
        {/* Action & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-border rounded-lg px-2.5 py-1.5 bg-background text-xs"
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical Only</option>
              <option value="Warning">Warnings Only</option>
              <option value="Info">Info Only</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-border rounded-lg px-2.5 py-1.5 bg-background text-xs"
            >
              <option value="">All Categories</option>
              <option value="Order">Orders</option>
              <option value="Reservation">Reservations</option>
              <option value="Inventory">Inventory</option>
              <option value="AI">AI Intelligence</option>
              <option value="Employee">Employees</option>
              <option value="Billing">Billing</option>
            </select>
          </div>

          <Button onClick={handleMarkAllRead} size="sm" variant="outline" className="gap-1.5 text-xs">
            <Check size={14} /> Mark All as Read ({unreadCount})
          </Button>
        </div>

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-xs space-y-2">
                <Bell size={40} className="mx-auto text-muted-foreground/30" />
                <p className="font-semibold text-foreground">No alerts found</p>
                <p>Your workspace is running smoothly with zero active warnings.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <AlertCard key={notif._id} alert={notif} onRefresh={loadData} />
              ))
            )}
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
