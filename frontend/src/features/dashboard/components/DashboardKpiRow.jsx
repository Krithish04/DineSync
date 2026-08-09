import { IndianRupee, TrendingUp, Star, Users, ShoppingBag, Table as TableIcon, Calendar, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * DashboardKpiRow — Displays 4 responsive KPI cards at the top of the restaurant dashboard.
 * Labels are 13px muted text above a 24px/500 font-display number.
 */
export default function DashboardKpiRow({ kpis, isLoading, role }) {
  const isAdmin = ['owner', 'super_admin'].includes(role);
  const isManager = role === 'manager';

  // Define cards based on role
  let cards = [];

  if (isAdmin) {
    cards = [
      {
        id: 'revenue',
        label: "Today's Revenue",
        value: kpis?.revenue != null ? `₹${Number(kpis.revenue).toLocaleString('en-IN')}` : '—',
        subtext: 'Sales total for today',
        icon: IndianRupee,
        iconBg: 'bg-primary/10 text-primary',
      },
      {
        id: 'monthRevenue',
        label: 'Monthly Revenue',
        value: kpis?.monthRevenue != null ? `₹${Number(kpis.monthRevenue).toLocaleString('en-IN')}` : '—',
        subtext: 'Total sales this month',
        icon: TrendingUp,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
      },
      {
        id: 'averageRating',
        label: 'Average Rating',
        value: kpis?.averageRating != null ? `⭐ ${Number(kpis.averageRating).toFixed(1)} / 5` : '—',
        subtext: 'Guest feedback score',
        icon: Star,
        iconBg: 'bg-amber-500/10 text-amber-600',
      },
      {
        id: 'activeEmployees',
        label: 'Active Employees',
        value: kpis?.activeEmployees != null ? kpis.activeEmployees : '—',
        subtext: 'Total staff on roster',
        icon: Users,
        iconBg: 'bg-purple-500/10 text-purple-600',
      },
    ];
  } else if (isManager) {
    cards = [
      {
        id: 'orders',
        label: 'Active Orders',
        value: kpis?.activeOrders != null ? kpis.activeOrders : '—',
        subtext: 'In kitchen or active service',
        icon: ShoppingBag,
        iconBg: 'bg-sky-500/10 text-sky-600',
      },
      {
        id: 'tables',
        label: 'Tables Occupied',
        value:
          kpis?.occupiedTables != null && kpis?.totalTables != null
            ? `${kpis.occupiedTables} / ${kpis.totalTables}`
            : kpis?.occupiedTables != null
            ? kpis.occupiedTables
            : '—',
        subtext: 'Current floor occupancy',
        icon: TableIcon,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
      },
      {
        id: 'reservations',
        label: "Today's Bookings",
        value: kpis?.todayReservations != null ? kpis.todayReservations : '—',
        subtext: 'Confirmed guest reservations',
        icon: Calendar,
        iconBg: 'bg-purple-500/10 text-purple-600',
      },
      {
        id: 'lowStock',
        label: 'Low Stock Items',
        value: kpis?.lowStockCount != null ? kpis.lowStockCount : '—',
        subtext: 'Ingredients below threshold',
        icon: Package,
        iconBg: 'bg-amber-500/10 text-amber-600',
      },
    ];
  } else {
    // Staff variant: 3 cards focused strictly on floor operations
    cards = [
      {
        id: 'orders',
        label: 'Active Orders',
        value: kpis?.activeOrders != null ? kpis.activeOrders : '—',
        subtext: 'Active floor orders',
        icon: ShoppingBag,
        iconBg: 'bg-sky-500/10 text-sky-600',
      },
      {
        id: 'tables',
        label: 'Tables Occupied',
        value:
          kpis?.occupiedTables != null && kpis?.totalTables != null
            ? `${kpis.occupiedTables} / ${kpis.totalTables}`
            : kpis?.occupiedTables != null
            ? kpis.occupiedTables
            : '—',
        subtext: 'Current floor occupancy',
        icon: TableIcon,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
      },
      {
        id: 'reservations',
        label: "Today's Bookings",
        value: kpis?.todayReservations != null ? kpis.todayReservations : '—',
        subtext: 'Confirmed guest reservations',
        icon: Calendar,
        iconBg: 'bg-purple-500/10 text-purple-600',
      },
    ];
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.id} className="hover:border-primary/40 transition-colors shadow-xs">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div>
                {isLoading ? (
                  <div className="h-7 w-24 bg-muted animate-pulse rounded my-1" />
                ) : (
                  <p className="text-2xl font-semibold font-display text-foreground tracking-tight">
                    {card.value}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">{card.subtext}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
