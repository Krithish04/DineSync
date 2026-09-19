import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import useSocketStore from '@/store/socket.store';
import NotificationDrawer from './NotificationDrawer';
import * as notificationApi from '../api/notification.api';

export default function NotificationBell() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);
  const socket = useSocketStore((s) => s.socket);

  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadUnread = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await notificationApi.listNotifications(restaurantId, { limit: 1 });
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* non-fatal */
    }
  }, [restaurantId]);

  useEffect(() => { loadUnread(); }, [loadUnread]);

  // Real-time Socket.IO listener for new alerts
  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = () => {
      loadUnread();
    };

    socket.on('notification:new', handleNewNotif);
    return () => socket.off('notification:new', handleNewNotif);
  }, [socket, loadUnread]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative p-2 h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
        title={unreadCount > 0 ? `${unreadCount} unread system notifications` : 'Notifications'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-extrabold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center border-2 border-background shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          loadUnread();
        }}
      />
    </>
  );
}
