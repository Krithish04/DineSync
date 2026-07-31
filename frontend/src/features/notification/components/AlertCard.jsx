import React, { memo } from 'react';
import { AlertCircle, AlertTriangle, Info, Check, Archive, Trash2 } from 'lucide-react';
import useAuthStore from '@/features/auth/store/auth.store';
import * as notificationApi from '../api/notification.api';

const AlertCard = memo(function AlertCard({ alert, onRefresh }) {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const priorityStyles = {
    Critical: 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300',
    Warning:  'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    Info:     'border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300',
  };

  const PriorityIcon =
    alert.priority === 'Critical'
      ? AlertCircle
      : alert.priority === 'Warning'
      ? AlertTriangle
      : Info;

  const handleMarkRead = async () => {
    try {
      await notificationApi.markAsRead(restaurantId, alert._id);
      if (onRefresh) onRefresh();
    } catch { /* non-fatal */ }
  };

  const handleArchive = async () => {
    try {
      await notificationApi.archiveNotification(restaurantId, alert._id);
      if (onRefresh) onRefresh();
    } catch { /* non-fatal */ }
  };

  const handleDelete = async () => {
    try {
      await notificationApi.deleteNotification(restaurantId, alert._id);
      if (onRefresh) onRefresh();
    } catch { /* non-fatal */ }
  };

  return (
    <div
      className={`border rounded-xl p-3.5 space-y-2 transition-all ${
        alert.isRead ? 'opacity-70 bg-card border-border' : priorityStyles[alert.priority] || priorityStyles.Info
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PriorityIcon size={16} className="shrink-0" />
          <h4 className="text-xs font-semibold font-display text-foreground">{alert.title}</h4>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border border-border shrink-0">
          {alert.category}
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>

      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/40">
        <span>{new Date(alert.createdAt).toLocaleString('en-IN')}</span>

        <div className="flex items-center gap-1">
          {!alert.isRead && (
            <button onClick={handleMarkRead} title="Mark Read" className="p-1 hover:text-foreground">
              <Check size={13} />
            </button>
          )}
          {!alert.isArchived && (
            <button onClick={handleArchive} title="Archive" className="p-1 hover:text-foreground">
              <Archive size={13} />
            </button>
          )}
          <button onClick={handleDelete} title="Delete" className="p-1 hover:text-rose-600">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default AlertCard;
