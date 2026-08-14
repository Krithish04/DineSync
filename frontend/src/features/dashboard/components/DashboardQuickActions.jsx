import { Calendar, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DashboardQuickActions — Compact action bar for high-frequency one-off actions.
 * Enforces role-based visibility; returns null for roles without active quick actions.
 */
export default function DashboardQuickActions({ onNavigate, role }) {
  const canSeeReservations = ['manager', 'owner', 'super_admin'].includes(role);

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
          <h3 className="text-xs font-semibold text-foreground leading-tight">Quick Actions &amp; Setup</h3>
          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Customize kitchen stations, manage table reservations, and configure restaurant layout.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate('/restaurant/settings')}
          className="text-xs h-8 font-semibold shadow-xs w-full sm:w-auto shrink-0 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Layers className="h-3.5 w-3.5 mr-1.5 text-primary" /> Customize Kitchen Stations
        </Button>

        <Button
          size="sm"
          onClick={() => onNavigate('/restaurant/reservations/new')}
          className="text-xs h-8 font-medium shadow-xs w-full sm:w-auto shrink-0"
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5" /> New Reservation
        </Button>
      </div>
    </div>
  );
}
