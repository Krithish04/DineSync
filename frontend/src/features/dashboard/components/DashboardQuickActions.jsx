import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DashboardQuickActions — Compact action bar for high-frequency one-off actions.
 * Enforces role-based visibility; returns null for roles without active quick actions.
 */
export default function DashboardQuickActions({ onNavigate, role }) {
  const canSeeReservations = ['manager', 'super_admin'].includes(role);

  // If role has no quick actions available, omit rendering
  if (!canSeeReservations) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 sm:px-4 sm:py-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
          <Calendar className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-foreground leading-tight">Quick Action</h3>
          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Create a new table reservation for guests or phone bookings.</p>
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => onNavigate('/restaurant/reservations/new')}
        className="text-xs h-8 font-medium shadow-xs w-full sm:w-auto shrink-0"
      >
        <Calendar className="h-3.5 w-3.5 mr-1.5" /> New Reservation
      </Button>
    </div>
  );
}
