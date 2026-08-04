import { Plus, Calendar, ChefHat, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DashboardQuickActions — Compact row of 2-4 high-frequency action buttons.
 * Avoids duplicating sidebar links by focusing strictly on common quick-create/view tasks.
 */
export default function DashboardQuickActions({ onNavigate, role }) {
  const isAdmin = ['owner', 'super_admin'].includes(role);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
        <p className="text-xs text-muted-foreground">Jump directly into daily workflow tasks.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        <Button
          size="sm"
          onClick={() => onNavigate('/restaurant/orders/new')}
          className="text-xs h-9 font-medium"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Order
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate('/restaurant/reservations/new')}
          className="text-xs h-9 font-medium"
        >
          <Calendar className="h-4 w-4 mr-1.5" /> New Reservation
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate('/restaurant/kitchen')}
          className="text-xs h-9 font-medium"
        >
          <ChefHat className="h-4 w-4 mr-1.5 text-primary" /> Kitchen Display
        </Button>

        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/restaurant/reports/executive')}
            className="text-xs h-9 font-medium border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
          >
            <TrendingUp className="h-4 w-4 mr-1.5 text-purple-600" /> Executive BI
          </Button>
        )}
      </div>
    </div>
  );
}
