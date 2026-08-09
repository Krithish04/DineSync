import { useState } from 'react';
import { Pencil, Trash2, QrCode, Users, ClipboardList, LogOut, Eye, ChevronDown, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: 'Available', label: 'Available', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
  { value: 'Occupied', label: 'Occupied', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400' },
  { value: 'Reserved', label: 'Reserved', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400' },
  { value: 'Cleaning', label: 'Cleaning', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400' },
  { value: 'Maintenance', label: 'Maintenance', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400' },
  { value: 'Inactive', label: 'Inactive', color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400' },
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
  onViewOrder,
  onUnmerge,
  canManage = false,
}) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const isInactive = !table.isActive || table.status === 'Inactive';
  const effectiveStatus = isInactive ? 'Inactive' : table.status;
  const currentStatusObj = STATUS_OPTIONS.find((opt) => opt.value === effectiveStatus) || STATUS_OPTIONS[0];

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

  const hasMiddleContent = Boolean(table.notes || (table.status === 'Occupied' && table.currentHostName));

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 border-l-4 hover:shadow-md ${
      isInactive ? 'border-l-slate-400 opacity-90 bg-muted/20' :
      table.status === 'Available' ? 'border-l-emerald-500' :
      table.status === 'Occupied' ? 'border-l-orange-500' :
      table.status === 'Reserved' ? 'border-l-sky-500' :
      table.status === 'Cleaning' ? 'border-l-amber-500' : 'border-l-rose-500'
    }`}>
      <CardContent className="p-4 space-y-3.5">
        {/* Header - Title, Type Badges & Top Action Icons */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-display text-lg font-bold text-foreground flex items-baseline gap-1.5">
              Table {table.tableNumber}
              {table.tableName && (
                <span className="text-xs font-normal text-muted-foreground italic truncate max-w-[120px]">
                  ({table.tableName})
                </span>
              )}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                TYPE_COLORS[table.type] || 'bg-muted'
              }`}>
                {table.type}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
                <Users className="h-3 w-3" />
                {table.mergedTables && table.mergedTables.length > 0
                  ? `${table.capacity + table.mergedTables.reduce((sum, st) => sum + (st.capacity || 0), 0)} Seats (Group)`
                  : `${table.capacity} Seats`}
              </span>

              {/* Secondary Merged Table Badge */}
              {table.mergedInto && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5">
                  Merged → Table #{table.mergedInto.tableNumber || 'Primary'}
                </span>
              )}

              {/* Primary Seating Group Badge */}
              {table.mergedTables && table.mergedTables.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5">
                  {table.mergedTables.length + 1} Tables Merged
                </span>
              )}
            </div>
          </div>

          {/* Top-Right Action Toolbar */}
          <div className="flex items-center gap-0.5 shrink-0 bg-muted/30 p-1 rounded-xl border border-border/40">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
              onClick={() => onQrClick(table)}
              title="View QR Code"
            >
              <QrCode className="h-3.5 w-3.5" />
            </Button>
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                  onClick={() => onEdit(table)}
                  title="Edit Table"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                  onClick={() => onDelete(table)}
                  title="Delete Table"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Middle Section (Only rendered if host or notes exist) */}
        {hasMiddleContent && (
          <div className="border-t border-border/40 pt-2.5 text-xs space-y-1">
            {table.status === 'Occupied' && table.currentHostName && (
              <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-300 font-medium">
                <User className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                <span className="truncate">Host: <strong className="text-foreground">{table.currentHostName}</strong></span>
              </div>
            )}
            {table.notes && (
              <div className="flex items-start gap-1 text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="italic line-clamp-2">{table.notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions & Status Dropdown */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3 gap-2 flex-wrap">
          {/* Status Dropdown Indicator */}
          <div className="relative shrink-0 min-w-[125px]">
            {canManage ? (
              <div className="relative">
                <select
                  value={table.status}
                  onChange={handleStatusUpdate}
                  disabled={isUpdatingStatus}
                  className={`w-full appearance-none rounded-lg border pl-2.5 pr-7 py-1 text-xs font-bold cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-ring ${
                    currentStatusObj.color
                  }`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-popover text-popover-foreground font-semibold">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                {isUpdatingStatus && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
            ) : (
              <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${currentStatusObj.color}`}>
                {table.status}
              </span>
            )}
          </div>

          {/* Action Buttons for Occupied Tables */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {table.mergedTables && table.mergedTables.length > 0 && onUnmerge && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUnmerge(table)}
                className="h-7 text-[11px] font-bold text-purple-600 border-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:border-purple-900/50 gap-1 px-2.5 rounded-lg"
                title="Unmerge tables back to independent status"
              >
                <span>Unmerge Group</span>
              </Button>
            )}

            {table.status === 'Occupied' && onViewOrder && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewOrder(table)}
                className="h-7 text-[11px] font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 gap-1 px-2.5 rounded-lg"
                title="View Current Table Orders"
              >
                <Eye size={12} />
                <span>View Order</span>
              </Button>
            )}

            {canManage && table.status === 'Occupied' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceLogout}
                disabled={isUpdatingStatus}
                className="h-7 text-[11px] font-semibold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50 gap-1 px-2.5 rounded-lg"
                title="Force Logout Diner & Empty Table"
              >
                <LogOut size={12} />
                <span>Empty Table</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
