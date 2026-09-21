import { useState } from 'react';
import { Pencil, Trash2, QrCode, Users, ClipboardList, LogOut, Eye, ChevronDown, User, CheckSquare, Square, MapPin, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: 'Available', label: 'Available (Empty)', dot: 'bg-emerald-500', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50' },
  { value: 'Occupied', label: 'Occupied', dot: 'bg-amber-500', color: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50' },
  { value: 'Needs Attention', label: 'Needs Attention 🛎️', dot: 'bg-rose-500 animate-ping', color: 'bg-rose-500/10 text-rose-800 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50' },
  { value: 'Bill Requested', label: 'Bill Requested 💳', dot: 'bg-purple-500', color: 'bg-purple-500/10 text-purple-800 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50' },
  { value: 'Reserved', label: 'Reserved', dot: 'bg-sky-500', color: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50' },
  { value: 'Cleaning', label: 'Cleaning', dot: 'bg-yellow-500', color: 'bg-yellow-500/10 text-yellow-800 border-yellow-500/30 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/50' },
  { value: 'Maintenance', label: 'Maintenance', dot: 'bg-rose-500', color: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50' },
  { value: 'Inactive', label: 'Inactive', dot: 'bg-slate-400', color: 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/50' },
];

const BORDER_STATUS_COLORS = {
  Available: 'border-l-emerald-500',
  Occupied: 'border-l-amber-500 bg-amber-500/5',
  'Needs Attention': 'border-l-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30 animate-pulse',
  'Bill Requested': 'border-l-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30',
  Reserved: 'border-l-sky-500',
  Cleaning: 'border-l-yellow-500',
  Maintenance: 'border-l-rose-500',
  Inactive: 'border-l-slate-400 opacity-80 bg-muted/20',
};

const TYPE_COLORS = {
  Indoor: 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  Outdoor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  VIP: 'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  Private: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
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
  isSelected = false,
  onToggleSelect,
  isSelectionMode = false,
}) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const isInactive = !table.isActive || table.status === 'Inactive';
  const effectiveStatus = isInactive ? 'Inactive' : table.status;
  const currentStatusObj = STATUS_OPTIONS.find((opt) => opt.value === effectiveStatus) || STATUS_OPTIONS[0];

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input') || e.target.closest('a')) {
      return;
    }
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(table._id);
      return;
    }
    if (onViewOrder) {
      onViewOrder(table);
    }
  };

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
  const cleanTableName = table.tableName ? table.tableName.replace(/^\s*\(\s*|\s*\)\s*$/g, '').trim() : '';

  return (
    <Card
      onClick={handleCardClick}
      className={`group relative overflow-hidden transition-all duration-200 border border-border/60 border-l-4 hover:shadow-md cursor-pointer rounded-2xl bg-card ${
        BORDER_STATUS_COLORS[effectiveStatus] || 'border-l-emerald-500'
      } ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : ''}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header - Checkbox, Title & Action Toolbar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {(isSelectionMode || canManage) && onToggleSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(table._id);
                }}
                className="text-muted-foreground hover:text-primary transition-colors focus:outline-none shrink-0"
                title={isSelected ? 'Deselect table' : 'Select table for bulk action'}
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary fill-primary/10" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground/50" />
                )}
              </button>
            )}

            <div className="min-w-0">
              <h4 className="font-sans text-base font-bold text-foreground flex items-center gap-1.5 truncate">
                <span>Table {table.tableNumber}</span>
                {cleanTableName && (
                  <span className="text-xs font-normal text-muted-foreground italic truncate max-w-[120px]" title={cleanTableName}>
                    ({cleanTableName})
                  </span>
                )}
                {table.isAccessible && <span className="text-xs" title="Wheelchair Accessible">♿</span>}
              </h4>
            </div>
          </div>

          {/* Top-Right Minimal Action Toolbar */}
          <div className="flex items-center gap-1 shrink-0 bg-muted/40 p-1 rounded-xl border border-border/50">
            <button
              type="button"
              className="p-1.5 text-muted-foreground/70 hover:text-primary hover:bg-background rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onQrClick(table);
              }}
              title="View QR Code"
            >
              <QrCode className="h-4 w-4" />
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-background rounded-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(table);
                  }}
                  title="Edit Table"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(table);
                  }}
                  title="Delete Table"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-md border whitespace-nowrap ${
            TYPE_COLORS[table.type] || 'bg-muted text-muted-foreground border-border/40'
          }`}>
            {table.type}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/50 rounded-md border border-border/40 whitespace-nowrap">
            <Users className="h-3 w-3" />
            {table.mergedTables && table.mergedTables.length > 0
              ? `${table.capacity + table.mergedTables.reduce((sum, st) => sum + (st.capacity || 0), 0)} Seats (Group)`
              : `${table.capacity} Seats`}
          </span>

          {/* Zone Badge */}
          {table.zone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 rounded-md border border-sky-200/60 dark:border-sky-800/40 whitespace-nowrap">
              <MapPin className="h-3 w-3 text-sky-500" /> {table.zone}
            </span>
          )}

          {/* Secondary Merged Table Badge */}
          {table.mergedInto && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 rounded-md whitespace-nowrap">
              Merged → Table #{table.mergedInto.tableNumber || 'Primary'}
            </span>
          )}

          {/* Primary Seating Group Badge */}
          {table.mergedTables && table.mergedTables.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 rounded-md whitespace-nowrap">
              {table.mergedTables.length + 1} Tables Merged
            </span>
          )}
        </div>

        {/* Middle Section (Host or notes) */}
        {hasMiddleContent && (
          <div className="border-t border-border/40 pt-2 text-xs space-y-1">
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
        <div className="flex items-center justify-between border-t border-border/40 pt-2.5 gap-2 flex-wrap">
          {/* Status Dropdown Pill */}
          <div className="relative shrink-0 min-w-[140px]">
            {canManage ? (
              <div className="relative">
                <select
                  value={table.status}
                  onChange={handleStatusUpdate}
                  disabled={isUpdatingStatus}
                  className={`w-full appearance-none rounded-xl border pl-3 pr-7 py-1.5 text-xs font-bold cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-ring ${
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
              <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${currentStatusObj.color}`}>
                <span className={`h-2 w-2 rounded-full ${currentStatusObj.dot}`} />
                {table.status}
              </span>
            )}
          </div>

          {/* Action Buttons for Occupied Tables */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-wrap">
            {table.mergedTables && table.mergedTables.length > 0 && onUnmerge && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnmerge(table);
                }}
                className="h-8 text-xs font-bold text-purple-600 border-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:border-purple-900/50 gap-1 px-2.5 rounded-xl"
                title="Unmerge tables back to independent status"
              >
                <span>Unmerge Group</span>
              </Button>
            )}

            {table.status === 'Occupied' && onViewOrder && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewOrder(table);
                }}
                className="h-8 text-xs font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 gap-1.5 px-2.5 rounded-xl"
                title="View Current Table Orders"
              >
                <Eye size={14} />
                <span>View Order</span>
              </Button>
            )}

            {canManage && table.status === 'Cleaning' && (
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsUpdatingStatus(true);
                  try {
                    await onStatusChange(table._id, 'Available');
                  } catch {
                    // Handled by parent
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }}
                disabled={isUpdatingStatus}
                className="h-8 text-xs font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 gap-1.5 px-3 rounded-xl shadow-xs"
                title="Accept cleaning done & mark table as Available"
              >
                <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Complete Cleaning</span>
              </Button>
            )}

            {canManage && table.status === 'Occupied' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleForceLogout();
                }}
                disabled={isUpdatingStatus}
                className="h-8 text-xs font-semibold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50 gap-1.5 px-2.5 rounded-xl"
                title="Force Logout Diner & Empty Table"
              >
                <LogOut size={14} />
                <span>Empty Table</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
