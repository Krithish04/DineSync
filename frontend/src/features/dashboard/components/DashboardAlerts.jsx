import { AlertTriangle, Package, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DashboardAlerts — Shows an "attention needed" strip ONLY when there are low-stock
 * items or pending reservation confirmations. Hidden entirely when empty.
 */
export default function DashboardAlerts({ lowStockCount = 0, pendingReservationsCount = 0, onNavigate }) {
  const hasLowStock = lowStockCount > 0;
  const hasPendingBookings = pendingReservationsCount > 0;

  if (!hasLowStock && !hasPendingBookings) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-amber-900 dark:text-amber-200">
            Attention Required
          </h4>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {hasLowStock && (
              <span className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5 inline shrink-0" />
                <strong>{lowStockCount}</strong> {lowStockCount === 1 ? 'ingredient' : 'ingredients'} low on stock
              </span>
            )}
            {hasLowStock && hasPendingBookings && <span>•</span>}
            {hasPendingBookings && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 inline shrink-0" />
                <strong>{pendingReservationsCount}</strong> {pendingReservationsCount === 1 ? 'reservation' : 'reservations'} pending confirmation
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
        {hasLowStock && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/restaurant/inventory/ingredients')}
            className="text-xs h-8 bg-card/60 hover:bg-card border-amber-500/30 text-amber-900 dark:text-amber-100"
          >
            Review Inventory <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
        {hasPendingBookings && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/restaurant/reservations/list')}
            className="text-xs h-8 bg-card/60 hover:bg-card border-amber-500/30 text-amber-900 dark:text-amber-100"
          >
            Manage Bookings <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
