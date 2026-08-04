import { useState } from 'react';
import { Pencil, Trash2, QrCode, Users, MapPin, ClipboardList, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: 'Available', label: 'Available', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400' },
  { value: 'Occupied', label: 'Occupied', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400' },
  { value: 'Reserved', label: 'Reserved', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400' },
  { value: 'Cleaning', label: 'Cleaning', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400' },
  { value: 'Maintenance', label: 'Maintenance', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400' },
];

const TYPE_COLORS = {
  Indoor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  Outdoor: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
  VIP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Private: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export default function TableCard({
  table,
  onEdit,
  onDelete,
  onQrClick,
  onStatusChange,
  canManage = false,
}) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const currentStatusObj = STATUS_OPTIONS.find((opt) => opt.value === table.status) || STATUS_OPTIONS[0];

  const handleStatusUpdate = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === table.status) return;

    setIsUpdatingStatus(true);
    try {
      await onStatusChange(table._id, newStatus);
    } catch {
      // Error handled by parent list page
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleForceLogout = async () => {
    if (!window.confirm(`Are you sure you want to force logout and empty Table ${table.tableNumber}? This will end the active diner session and mark the table as Available.`)) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await onStatusChange(table._id, 'Available');
    } catch {
      // Error handled by parent list page
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 border-l-4 hover:shadow-md ${
      table.status === 'Available' ? 'border-l-emerald-500' :
      table.status === 'Occupied' ? 'border-l-orange-500' :
      table.status === 'Reserved' ? 'border-l-sky-500' :
      table.status === 'Cleaning' ? 'border-l-amber-500' : 'border-l-rose-500'
    }`}>
      <CardContent className="p-5 space-y-4">
        {/* Header - Number and Type */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-display text-lg font-bold text-foreground flex items-baseline gap-1.5">
              Table {table.tableNumber}
              {table.tableName && (
                <span className="text-xs font-normal text-muted-foreground italic">
                  ({table.tableName})
                </span>
              )}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                TYPE_COLORS[table.type] || 'bg-muted'
              }`}>
                {table.type}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
                <Users className="h-3 w-3" />
                {table.capacity} Seats
              </span>
            </div>
          </div>

          {/* QR Code Action */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onQrClick(table)}
            title="View QR Code"
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>

        {/* Notes */}
        <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
          {table.notes && (
            <div className="flex items-start gap-1">
              <ClipboardList className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="italic line-clamp-2">{table.notes}</span>
            </div>
          )}
        </div>

        {/* Footer Actions & Status update */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3 gap-2">
          {/* Status Dropdown Indicator */}
          <div className="relative flex-1 max-w-[130px]">
            {canManage ? (
              <>
                <select
                  value={table.status}
                  onChange={handleStatusUpdate}
                  disabled={isUpdatingStatus}
                  className={`w-full appearance-none rounded border px-2.5 py-1 text-xs font-semibold select-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-colors ${
                    currentStatusObj.color
                  }`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-background text-foreground font-normal">
                      {opt.label}
                    </option>
                  ))}
                </select>
                {isUpdatingStatus && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </>
            ) : (
              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${currentStatusObj.color}`}>
                {table.status}
              </span>
            )}
          </div>

          {/* Force Logout Action for Occupied Tables */}
          {canManage && table.status === 'Occupied' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceLogout}
              disabled={isUpdatingStatus}
              className="h-7 text-[11px] font-semibold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 flex items-center gap-1 shrink-0"
              title="Force Logout Diner & Empty Table"
            >
              <LogOut size={12} />
              <span>Empty Table</span>
            </Button>
          )}

          {/* Edit / Delete Buttons */}
          {canManage && (
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={() => onEdit(table)}
                title="Edit table details"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted text-destructive hover:text-destructive/80"
                onClick={() => onDelete(table)}
                title="Delete table"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
