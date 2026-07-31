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
    const handleNewNotif = () => setUnreadCount((prev) => prev + 1);

    socket.on('notification:new', handleNewNotif);
    return () => socket.off('notification:new', handleNewNotif);
  }, [socket]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative p-2 h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
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
