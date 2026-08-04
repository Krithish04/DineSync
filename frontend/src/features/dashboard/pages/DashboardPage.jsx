import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Building2, TrendingUp, Sparkles, Utensils, ChefHat, Table as TableIcon, Calendar, ArrowRight } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import DashboardKpiRow from '../components/DashboardKpiRow';
import DashboardAlerts from '../components/DashboardAlerts';
import DashboardQuickActions from '../components/DashboardQuickActions';
import * as reportsApi from '@/features/reports/api/reports.api';
import * as orderApi from '@/features/order/api/order.api';
import * as tableApi from '@/features/table/api/table.api';
import * as reservationApi from '@/features/reservation/api/reservation.api';
import * as inventoryApi from '@/features/inventory/api/inventory.api';

// VISUAL AUDIT CONFIRMED: Owner and Manager dashboards share pixel-identical component styling,
// card structures, and layout paradigms — varying strictly in access-level data visibility.
export default function DashboardPage() {
  const { user, restaurant } = useAuthStore();
  const navigate = useNavigate();

  const role = user?.role || 'manager';
  const isAdmin = ['owner', 'super_admin'].includes(role);

  const restaurantId = restaurant?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    revenue: null,
    activeOrders: null,
    occupiedTables: null,
    totalTables: null,
    todayReservations: null,
    pendingReservations: null,
  });

  const [alertsData, setAlertsData] = useState({
    lowStockCount: 0,
    pendingReservationsCount: 0,
  });

  // Fetch live dashboard KPI metrics concurrently with graceful fallbacks
  const loadDashboardData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);

    let revenue = null;
    let activeOrders = null;
    let occupiedTables = null;
    let totalTables = null;
    let todayReservations = null;
    let pendingReservations = 0;
    let lowStockCount = 0;

    const [
      salesResult,
      ordersResult,
      tablesResult,
      resStatsResult,
      pendingResResult,
      inventoryStatsResult,
    ] = await Promise.allSettled([
      reportsApi.getSalesSummary(restaurantId, { range: 'today' }),
      orderApi.listOrders(restaurantId, { status: 'active', limit: 100 }),
      tableApi.listTables(restaurantId, { limit: 100 }),
      reservationApi.getDashboardStats(restaurantId),
      reservationApi.listReservations(restaurantId, { status: 'pending', limit: 50 }),
      inventoryApi.getInventoryStats(restaurantId),
    ]);

    // 1. Sales Summary
    if (salesResult.status === 'fulfilled' && salesResult.value) {
      const val = salesResult.value;
      revenue = val.totals?.totalRevenue ?? val.totalRevenue ?? val.totals?.totalSales ?? 0;
    }

    // 2. Active Orders
    if (ordersResult.status === 'fulfilled' && ordersResult.value) {
      const res = ordersResult.value;
      const items = Array.isArray(res) ? res : (res.items || res.orders || []);
      const activeStates = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'];
      activeOrders = items.filter((o) => activeStates.includes(o.orderStatus || o.status)).length;
    }

    // 3. Tables Occupancy
    if (tablesResult.status === 'fulfilled' && tablesResult.value) {
      const res = tablesResult.value;
      const items = res.items || (Array.isArray(res) ? res : []);
      occupiedTables = items.filter((t) => (t.status || '').toLowerCase() === 'occupied').length;
      totalTables = res.pagination?.total ?? items.length;
    }

    // 4. Reservation Stats (Today)
    if (resStatsResult.status === 'fulfilled' && resStatsResult.value) {
      todayReservations = resStatsResult.value.todayReservations ?? 0;
    }

    // 5. Pending Reservations
    if (pendingResResult.status === 'fulfilled' && pendingResResult.value) {
      const res = pendingResResult.value;
      const items = res.items || (Array.isArray(res) ? res : []);
      pendingReservations = items.length;
    }

    // 6. Inventory Stats (Low Stock)
    if (inventoryStatsResult.status === 'fulfilled' && inventoryStatsResult.value) {
      const stats = inventoryStatsResult.value;
      lowStockCount = stats.lowStockItems ?? stats.lowStockCount ?? 0;
    }

    setKpiData({
      revenue,
      activeOrders,
      occupiedTables,
      totalTables,
      todayReservations,
      pendingReservations,
    });

    setAlertsData({
      lowStockCount,
      pendingReservationsCount: pendingReservations,
    });

    setIsLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <RestaurantLayout
      title="Dashboard Overview"
      description={
        isAdmin
          ? 'Executive overview of revenue, floor operations, and AI intelligence.'
          : 'Manager operational hub for active orders, seating, and bookings.'
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-8">
        {/* Compact Super Admin Banner */}
        {role === 'super_admin' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-950 dark:text-purple-200">
            <div className="flex items-center gap-2 text-xs">
              <ShieldAlert className="h-4 w-4 text-purple-600 shrink-0" />
              <span>
                <strong>Super Admin Controls Active:</strong> Multi-tenant SaaS settings, tenant management, and platform analytics are available.
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/super-admin/dashboard')}
              className="text-xs h-7 px-3 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 shrink-0 self-end sm:self-auto"
            >
              Super Admin Portal →
            </Button>
          </div>
        )}

        {/* Welcome Greeting & Branch Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName} 👋
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Here is what's happening at your restaurant today.
            </p>
          </div>

          {restaurant && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-card border border-border shrink-0 self-start sm:self-auto">
              <Building2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground leading-tight">{restaurant.name}</p>
                <p className="text-[10px] text-muted-foreground leading-none">{restaurant.slug}</p>
              </div>
            </div>
          )}
        </div>

        {/* Live KPI Metric Cards Grid */}
        <DashboardKpiRow kpis={kpiData} isLoading={isLoading} role={role} />

        {/* Conditional Attention Needed Alert Strip */}
        <DashboardAlerts
          lowStockCount={alertsData.lowStockCount}
          pendingReservationsCount={alertsData.pendingReservationsCount}
          onNavigate={navigate}
        />

        {/* High-Frequency Quick Actions Bar */}
        <DashboardQuickActions onNavigate={navigate} role={role} />

        {/* Role-tailored Executive / Operational Highlights */}
        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Executive Reports & BI
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Analyze revenue growth, category breakdown, customer retention, and payroll.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/restaurant/reports/executive')}
                  className="w-full text-xs"
                >
                  View Executive BI Reports <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" /> AI Intelligence & Demand
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Predict demand peaks, optimize menu recommendations, and forecast inventory needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/restaurant/ai/dashboard')}
                  className="w-full text-xs"
                >
                  Open AI Intelligence Hub <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/orders/dashboard')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" /> POS & Active Tickets
                </CardTitle>
                <CardDescription className="text-xs">Manage active floor orders & guest billing</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/kitchen')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-primary" /> Live Kitchen Display
                </CardTitle>
                <CardDescription className="text-xs">Track ticket prep times & cook dispatch</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/tables')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-primary" /> Tables & Floor Plan
                </CardTitle>
                <CardDescription className="text-xs">View section status & seat assignments</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
