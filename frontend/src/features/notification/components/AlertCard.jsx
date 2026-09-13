import React, { memo } from 'react';
import { AlertCircle, AlertTriangle, Info, Check, Archive, Trash2, BellRing, CheckCircle2 } from 'lucide-react';
import useAuthStore from '@/features/auth/store/auth.store';
import { Button } from '@/components/ui/button';
import * as notificationApi from '../api/notification.api';

const AlertCard = memo(function AlertCard({ alert, onRefresh }) {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const priorityStyles = {
    Critical: 'border-rose-500/40 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300',
    Warning: 'border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300',
    Info: 'border-sky-500/30 bg-sky-50/70 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300',
  };

  const PriorityIcon =
    alert.priority === 'Critical'
      ? AlertCircle
      : alert.priority === 'Warning'
      ? AlertTriangle
      : Info;

  // Extract table number from title, message, or metadata if present
  let tableBadge = alert.tableNumber || alert.metadata?.tableNumber || null;
  if (!tableBadge) {
    const match = (alert.title + ' ' + alert.message).match(/table\s*#?\s*(\d+[A-Z]?)/i);
    if (match) tableBadge = match[1];
  }

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
      className={`border rounded-2xl p-4 space-y-3 transition-all ${
        alert.isRead
          ? 'opacity-80 bg-card border-border shadow-2xs'
          : priorityStyles[alert.priority] || priorityStyles.Info
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityIcon size={18} className="shrink-0 text-primary" />
          <h4 className="text-sm font-bold font-display text-foreground flex items-center gap-2">
            {alert.title}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {tableBadge && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/30">
              <BellRing size={12} />
              Table #{tableBadge}
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border uppercase tracking-wider">
            {alert.category || 'System'}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>

      {/* Action Toolbar with 44px+ Touch Targets */}
      <div className="flex items-center justify-between pt-2 text-xs border-t border-border/40 gap-2 flex-wrap">
        <span className="text-[11px] font-mono text-muted-foreground">
          {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div className="flex items-center gap-2 min-h-[44px]">
          {!alert.isRead ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkRead}
              className="h-10 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 min-h-[44px] px-3 rounded-xl gap-1 touch-manipulation"
            >
              <CheckCircle2 size={15} />
              <span>Acknowledge &amp; Resolve</span>
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <Check size={13} /> Resolved
            </span>
          )}

          {!alert.isArchived && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleArchive}
              title="Archive Alert"
              className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl min-h-[44px] touch-manipulation"
            >
              <Archive size={16} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title="Delete Alert"
            className="h-10 w-10 text-muted-foreground hover:text-destructive rounded-xl min-h-[44px] touch-manipulation"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
});

export default AlertCard;
