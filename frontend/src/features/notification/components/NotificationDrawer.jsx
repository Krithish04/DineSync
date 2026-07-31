import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import AlertCard from './AlertCard';
import * as notificationApi from '../api/notification.api';

export default function NotificationDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!restaurantId || !isOpen) return;
    setIsLoading(true);
    try {
      const data = await notificationApi.listNotifications(restaurantId, { limit: 20 });
      setNotifications(data.notifications || []);
    } catch {
      /* non-fatal */
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, isOpen]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead(restaurantId);
      loadData();
    } catch { /* non-fatal */ }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-l border-border w-full max-w-sm h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h3 className="text-sm font-bold font-display text-foreground">Notifications</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8 px-2 text-xs gap-1">
              <Check size={14} /> Read All
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-8 w-8">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <p className="text-xs text-center text-muted-foreground py-8">Loading alerts...</p>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-12 space-y-2">
              <Bell size={32} className="mx-auto text-muted-foreground/40" />
              <p>No new notifications.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <AlertCard key={notif._id} alert={notif} onRefresh={loadData} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/restaurant/notifications/center');
            }}
            className="w-full text-xs gap-1.5"
          >
            <span>Open Central Alert Center</span>
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
