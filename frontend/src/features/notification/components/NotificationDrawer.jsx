import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Bell, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import AlertCard from './AlertCard';
import * as notificationApi from '../api/notification.api';

export default function NotificationDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'

  const loadData = useCallback(async () => {
    if (!restaurantId || !isOpen) return;
    setIsLoading(true);
    try {
      const data = await notificationApi.listNotifications(restaurantId, { limit: 30 });
      setNotifications(data.notifications || []);
    } catch {
      /* non-fatal */
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, isOpen]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead(restaurantId);
      loadData();
    } catch {
      /* non-fatal */
    }
  };

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'critical') return notifications.filter((n) => n.priority === 'Critical');
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200">
      {/* Background Overlay Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="relative bg-card border-l border-border w-full max-w-md h-full flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-foreground leading-tight">Notifications</h3>
              <p className="text-xs text-muted-foreground">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground">
              <Check size={14} /> Mark Read
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Filter Quick Tabs */}
        <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              filter === 'all' ? 'bg-primary text-primary-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              filter === 'unread' ? 'bg-primary text-primary-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('critical')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              filter === 'critical' ? 'bg-rose-600 text-white font-semibold shadow-2xs' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Critical ({notifications.filter((n) => n.priority === 'Critical').length})
          </button>
        </div>

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader label="Loading workspace alerts..." />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-16 space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted/60 text-muted-foreground/60 mx-auto flex items-center justify-center">
                <Bell size={24} />
              </div>
              <p className="font-semibold text-foreground text-sm">All caught up!</p>
              <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto">
                {filter === 'all'
                  ? 'No notifications currently logged in your workspace.'
                  : `No ${filter} notifications found.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <AlertCard key={notif._id} alert={notif} onRefresh={loadData} />
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 border-t border-border bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/restaurant/notifications/center');
            }}
            className="w-full text-xs font-semibold gap-1.5 h-9 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <span>Open Central Alert Center</span>
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
