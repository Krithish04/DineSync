import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';

export default function ReservationHeader({ activeView = 'dashboard', title, description }) {
  const navigate = useNavigate();
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-display">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* View Switcher Toggle Buttons */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
          <Button
            size="xs"
            variant={activeView === 'dashboard' ? 'default' : 'ghost'}
            onClick={() => navigate('/restaurant/reservations/dashboard')}
            className={`h-8 gap-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === 'dashboard'
                ? 'bg-background text-foreground shadow-xs border border-border/40 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </Button>

          <Button
            size="xs"
            variant={activeView === 'list' ? 'default' : 'ghost'}
            onClick={() => navigate('/restaurant/reservations/list')}
            className={`h-8 gap-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === 'list'
                ? 'bg-background text-foreground shadow-xs border border-border/40 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" /> List View
          </Button>

          <Button
            size="xs"
            variant={activeView === 'calendar' ? 'default' : 'ghost'}
            onClick={() => navigate('/restaurant/reservations/calendar')}
            className={`h-8 gap-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === 'calendar'
                ? 'bg-background text-foreground shadow-xs border border-border/40 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Calendar Sheet
          </Button>
        </div>

        {/* Primary Action Button */}
        {canManage && (
          <Button size="xs" onClick={() => navigate('/restaurant/reservations/new')} className="h-8 gap-1.5 px-3 rounded-xl shadow-xs font-bold">
            <Plus className="h-3.5 w-3.5" /> Book Table
          </Button>
        )}
      </div>
    </div>
  );
}
