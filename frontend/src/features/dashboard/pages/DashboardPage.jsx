import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Building2,
  TrendingUp,
  Sparkles,
  Utensils,
  ChefHat,
  Table as TableIcon,
  Calendar,
  ArrowRight,
  Users,
  Star,
  UserCheck,
  Bell,
  IndianRupee,
  CreditCard,
  Package,
  MessageSquare,
  History,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import DashboardKpiRow from '../components/DashboardKpiRow';
import DashboardAlerts from '../components/DashboardAlerts';
import DashboardQuickActions from '../components/DashboardQuickActions';
import ChartWidget from '@/features/reports/components/ChartWidget';
import * as reportsApi from '@/features/reports/api/reports.api';
import * as orderApi from '@/features/order/api/order.api';
import * as tableApi from '@/features/table/api/table.api';
import * as reservationApi from '@/features/reservation/api/reservation.api';
import * as inventoryApi from '@/features/inventory/api/inventory.api';
import * as customerApi from '@/features/customer/api/customer.api';
import * as employeeApi from '@/features/employee/api/employee.api';

export default function DashboardPage() {
  const { user, restaurant } = useAuthStore();
  const navigate = useNavigate();

  const role = user?.role || 'manager';
  const isAdmin = ['owner', 'super_admin'].includes(role);

  const restaurantId = restaurant?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [kpiData, setKpiData] = useState({
    revenue: null,
    monthRevenue: null,
    averageRating: null,
    activeEmployees: null,
    activeOrders: null,
    occupiedTables: null,
    totalTables: null,
    todayReservations: null,
    pendingReservations: null,
    lowStockCount: null,
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
    let monthRevenue = null;
    let averageRating = null;
    let activeEmployees = null;
    let activeOrders = null;
    let occupiedTables = null;
    let totalTables = null;
    let todayReservations = null;
    let pendingReservations = 0;
    let lowStockCount = 0;

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      salesResult,
      monthSalesResult,
      trendSalesResult,
      feedbackResult,
      employeeResult,
      ordersResult,
      tablesResult,
      resStatsResult,
      pendingResResult,
      inventoryStatsResult,
    ] = await Promise.allSettled([
      reportsApi.getSalesSummary(restaurantId, { range: 'today' }),
      reportsApi.getSalesSummary(restaurantId, { startDate: monthStart, endDate: now.toISOString() }),
      reportsApi.getSalesSummary(restaurantId, { startDate: last7Days, endDate: now.toISOString(), groupBy: 'day' }),
      customerApi.listFeedback(restaurantId, { aggregate: 'true' }),
      employeeApi.getEmployeeStats ? employeeApi.getEmployeeStats(restaurantId) : employeeApi.listEmployees(restaurantId),
      orderApi.listOrders(restaurantId, { status: 'active', limit: 100 }),
      tableApi.listTables(restaurantId, { limit: 100 }),
      reservationApi.getDashboardStats(restaurantId),
      reservationApi.listReservations(restaurantId, { status: 'pending', limit: 50 }),
      inventoryApi.getInventoryStats(restaurantId),
    ]);

    // 1. Sales Today
    if (salesResult.status === 'fulfilled' && salesResult.value) {
      const val = salesResult.value;
      revenue = val.totals?.totalRevenue ?? val.totalRevenue ?? val.totals?.totalSales ?? 0;
    }

    // 2. Sales Monthly
    if (monthSalesResult.status === 'fulfilled' && monthSalesResult.value) {
      const val = monthSalesResult.value;
      monthRevenue = val.totals?.totalRevenue ?? val.totalRevenue ?? val.totals?.totalSales ?? 0;
    }

    // 3. 7-Day Sales Trend
    if (trendSalesResult.status === 'fulfilled' && trendSalesResult.value) {
      const res = trendSalesResult.value;
      const grouped = res.grouped || res.sales || [];
      const chartPoints = grouped.map((point) => ({
        day: point._id || point.date || point.day || '',
        revenue: point.totalRevenue ?? point.revenue ?? point.totalSales ?? 0,
      }));
      setTrendData(chartPoints);
    }

    // 4. Feedback Aggregate Rating
    if (feedbackResult.status === 'fulfilled' && feedbackResult.value) {
      const fb = feedbackResult.value;
      averageRating = fb.avgRating ?? fb.averageRating ?? fb.stats?.averageRating ?? null;
    }

    // 5. Active Employees
    if (employeeResult.status === 'fulfilled' && employeeResult.value) {
      const emp = employeeResult.value;
      activeEmployees = emp.activeEmployees ?? emp.totalEmployees ?? (Array.isArray(emp) ? emp.length : null);
    }

    // 6. Active Orders (Manager / Staff)
    if (ordersResult.status === 'fulfilled' && ordersResult.value) {
      const res = ordersResult.value;
      const items = Array.isArray(res) ? res : (res.items || res.orders || []);
      const activeStates = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'];
      activeOrders = items.filter((o) => activeStates.includes(o.orderStatus || o.status)).length;
    }

    // 7. Tables Occupancy (Manager / Staff)
    if (tablesResult.status === 'fulfilled' && tablesResult.value) {
      const res = tablesResult.value;
      const items = res.items || (Array.isArray(res) ? res : []);
      occupiedTables = items.filter((t) => (t.status || '').toLowerCase() === 'occupied').length;
      totalTables = res.pagination?.total ?? items.length;
    }

    // 8. Reservation Stats (Today)
    if (resStatsResult.status === 'fulfilled' && resStatsResult.value) {
      todayReservations = resStatsResult.value.todayReservations ?? 0;
    }

    // 9. Pending Reservations
    if (pendingResResult.status === 'fulfilled' && pendingResResult.value) {
      const res = pendingResResult.value;
      const items = res.items || (Array.isArray(res) ? res : []);
      pendingReservations = items.length;
    }

    // 10. Inventory Stats (Low Stock)
    if (inventoryStatsResult.status === 'fulfilled' && inventoryStatsResult.value) {
      const stats = inventoryStatsResult.value;
      lowStockCount = stats.lowStockItems ?? stats.lowStockCount ?? 0;
    }

    setKpiData({
      revenue,
      monthRevenue,
      averageRating,
      activeEmployees,
      activeOrders,
      occupiedTables,
      totalTables,
      todayReservations,
      pendingReservations,
      lowStockCount,
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
          ? 'Executive overview of revenue trends, customer feedback, and Owner oversight modules.'
          : role === 'manager'
          ? 'Manager operational hub for floor management, inventory, employees, and analytics.'
          : 'Staff operational portal for live floor orders and table bookings.'
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

        {/* Owner Compact 7-Day Revenue Trend Chart */}
        {isAdmin && (
          <Card className="hover:border-primary/40 transition-colors shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> 7-Day Revenue Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily revenue performance summary over the last 7 days.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/restaurant/reports/executive')}
                className="text-xs h-8"
              >
                View Executive BI →
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              <ChartWidget
                type="area"
                data={trendData}
                xKey="day"
                dataKeys={[{ key: 'revenue', label: 'Revenue (₹)', color: '#c2440f' }]}
                height={180}
                emptyLabel="No revenue recorded for the last 7 days."
              />
            </CardContent>
          </Card>
        )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* Card 1: Customers & CRM */}
            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/customers/dashboard')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Customers & CRM
                </CardTitle>
                <CardDescription className="text-xs">
                  Customer profiles, loyalty tiers, birthday rewards, and guest history.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Open CRM Portal <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 2: Feedback Insights */}
            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/feedback/insights')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Feedback Insights
                </CardTitle>
                <CardDescription className="text-xs">
                  Guest satisfaction ratings, sentiment analysis, and service quality trends.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Feedback Analytics <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 3: AI Intelligence */}
            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/ai/dashboard')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" /> AI Intelligence
                </CardTitle>
                <CardDescription className="text-xs">
                  Predictive sales forecasts, demand peaks, and smart menu optimization.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Open AI Hub <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 4: Employees & Payroll */}
            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/employees/dashboard')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-500" /> Employees & Payroll
                </CardTitle>
                <CardDescription className="text-xs">
                  Staff roster, attendance tracking, shift scheduling, and monthly payroll.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Manage Employees <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 5: Profile & GST Config */}
            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/profile')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-sky-500" /> Profile & GST Config
                </CardTitle>
                <CardDescription className="text-xs">
                  Restaurant profile, business info, branding, and GST tax settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Profile & GST <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 6: Alert Center */}
            <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/notifications/alerts')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-rose-500" /> Alert Center
                </CardTitle>
                <CardDescription className="text-xs">
                  Critical operational alerts, inventory thresholds, and system logs.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Open Alert Center <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : role === 'manager' ? (
          /* Manager Operational & Business Highlights */
          <div className="space-y-5 pt-2">
            {/* Tier 1: Run the Floor */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5 text-primary" /> Run the Floor
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/orders/history')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Order History
                    </CardTitle>
                    <CardDescription className="text-xs">Audit past guest orders, status & invoice breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View History <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/kitchen')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-amber-500" /> Kitchen Monitor
                    </CardTitle>
                    <CardDescription className="text-xs">Live, read-only monitor of cooking ticket status</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Open Monitor <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/tables')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-emerald-500" /> Tables & Floor Plan
                    </CardTitle>
                    <CardDescription className="text-xs">Table layout, occupancy status & seating assignments</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Floor Plan <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/billing/dashboard')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-sky-500" /> Billing & Invoices
                    </CardTitle>
                    <CardDescription className="text-xs">Guest invoices, payment collection & daily receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Open Billing Hub <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tier 2: Run the Business */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Run the Business
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/inventory/dashboard')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-500" /> Inventory & Stock
                    </CardTitle>
                    <CardDescription className="text-xs">Ingredient tracking, reorder alerts & supplier list</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Manage Stock <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/employees/dashboard')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-purple-500" /> Employees & Payroll
                    </CardTitle>
                    <CardDescription className="text-xs">Roster scheduling, attendance & monthly payroll</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Manage Staff <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/feedback/manage')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-rose-500" /> Customer Feedback
                    </CardTitle>
                    <CardDescription className="text-xs">Review diner ratings & manage service responses</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Feedback <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/restaurant/reports/sales')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Analytics Reports
                    </CardTitle>
                    <CardDescription className="text-xs">Sales summaries, item popularity & financial reports</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Sales Reports <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RestaurantLayout>
  );
}
