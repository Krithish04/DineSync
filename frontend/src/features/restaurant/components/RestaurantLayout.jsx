import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Utensils,
  FolderTree,
  Table as TableIcon,
  Calendar,
  ShoppingBag,
  ChefHat,
  Package,
  Users,
  Settings,
  Clock,
  Building2,
  CreditCard,
  UserCheck,
  TrendingUp,
  Sparkles,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileCheck,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/features/notification/components/NotificationBell';
import useAuthStore from '@/features/auth/store/auth.store';
import useSocketStore from '@/store/socket.store';
import * as authApi from '@/features/auth/api/auth.api';

// Grouped Sidebar Navigation Configuration
const NAV_GROUPS = [
  {
    group: 'Operations',
    roles: ['manager', 'owner', 'super_admin', 'staff', 'chef'],
    items: [
      { to: '/restaurant/staff-orders', label: 'Live Order Board', icon: ShoppingBag, roles: ['staff'] },
      { to: '/restaurant/orders/history', label: 'Order History', icon: History, roles: ['manager'] },
      { to: '/restaurant/kitchen', label: 'Kitchen Monitor', icon: ChefHat, roles: ['manager', 'staff', 'chef'] },
      { to: '/restaurant/reservations/dashboard', label: 'Reservations', icon: Calendar, roles: ['manager', 'staff'] },
      { to: '/restaurant/tables', label: 'Tables & Layout', icon: TableIcon, roles: ['manager'] },
      { to: '/restaurant/categories', label: 'Categories', icon: FolderTree, roles: ['manager'] },
      { to: '/restaurant/menu', label: 'Menu Catalog', icon: Utensils, roles: ['manager'] },
      { to: '/restaurant/inventory/dashboard', label: 'Inventory & Stock', icon: Package, roles: ['manager'] },
      { to: '/restaurant/inventory/suppliers', label: 'Suppliers & Vendors', icon: Building2, roles: ['manager'] },
      { to: '/restaurant/feedback/manage', label: 'Customer Feedback', icon: Bell, roles: ['manager'] },
      { to: '/restaurant/customers/dashboard', label: 'Customers & CRM', icon: Users, roles: ['owner'] },
    ],
  },
  {
    group: 'Administration',
    roles: ['owner', 'manager', 'super_admin'],
    items: [
      { to: '/restaurant/profile', label: 'Profile', icon: Settings, roles: ['owner'] },
      { to: '/restaurant/gst', label: 'GST Config', icon: FileCheck, roles: ['owner'] },
      { to: '/restaurant/opening-hours', label: 'Opening Hours', icon: Clock, roles: ['manager'] },
      { to: '/restaurant/settings', label: 'Settings', icon: Settings, roles: ['manager'] },
    ],
  },
  {
    group: 'Finance & Staff',
    roles: ['owner', 'manager', 'super_admin'],
    items: [
      { to: '/restaurant/billing/dashboard', label: 'Billing & Invoices', icon: CreditCard, roles: ['manager'] },
      { to: '/restaurant/employees/dashboard', label: 'Employees & Shift', icon: UserCheck, roles: ['owner', 'manager'] },
    ],
  },
  {
    group: 'Analytics & BI',
    roles: ['owner', 'manager', 'super_admin'],
    items: [
      { to: '/restaurant/reports/executive', label: 'Executive BI', icon: TrendingUp, roles: ['owner', 'super_admin'] },
      { to: '/restaurant/feedback/insights', label: 'Feedback Insights', icon: TrendingUp, roles: ['owner', 'super_admin'] },
      { to: '/restaurant/reports/sales', label: 'Sales Report', icon: TrendingUp, roles: ['manager', 'super_admin'] },
      { to: '/restaurant/reports/inventory', label: 'Inventory Report', icon: Package, roles: ['manager', 'super_admin'] },
      { to: '/restaurant/reports/employees', label: 'Employee Report', icon: UserCheck, roles: ['manager', 'super_admin'] },
      { to: '/restaurant/reports/financial', label: 'Financial Report', icon: CreditCard, roles: ['manager', 'super_admin'] },
    ],
  },
  {
    group: 'AI & Notifications',
    roles: ['owner', 'manager', 'super_admin'],
    items: [
      { to: '/restaurant/ai/dashboard', label: 'AI Intelligence', icon: Sparkles, roles: ['owner'] },
      { to: '/restaurant/notifications/alerts', label: 'Alert Center', icon: Bell, roles: ['owner', 'manager'] },
      { to: '/restaurant/notifications/center', label: 'Notification Center', icon: Bell, roles: ['manager'] },
      { to: '/restaurant/notifications/settings', label: 'Notification Settings', icon: Settings, roles: ['manager'] },
    ],
  },
];

/**
 * Modern Left Sidebar Shell for Restaurant Workspace.
 * Replaces horizontal scrolling tabs with a sleek, grouped vertical sidebar navigation.
 * Automatically initializes Socket.IO tenant room connection for real-time live updates.
 */
export default function RestaurantLayout({ title, description, children }) {
  const navigate = useNavigate();
  const { user, restaurant, clearSession } = useAuthStore();
  const role = user?.role || 'manager';
  const restaurantId = restaurant?._id;

  const connectSocket = useSocketStore((state) => state.connect);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-connect to real-time Socket.IO room for this restaurant
  useEffect(() => {
    if (restaurantId) {
      connectSocket(restaurantId);
    }
  }, [restaurantId, connectSocket]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  // Determine badge styling based on role
  let portalBadge = 'Manager';
  let badgeColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';

  if (['owner', 'super_admin'].includes(role)) {
    portalBadge = role === 'super_admin' ? 'Super Admin' : 'Admin & Owner';
    badgeColor = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
  } else if (role === 'staff') {
    portalBadge = 'Staff';
    badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  } else if (role === 'chef') {
    portalBadge = 'Chef / Kitchen';
    badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  }

  const staffCanEditMenu = Boolean(restaurant?.settings?.staffCanEditMenu);
  const dashboardTarget = role === 'staff' ? '/restaurant/staff-orders' : '/dashboard';

  // Filter navigation groups by role
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.roles.includes(role)) return true;
      if (role === 'staff' && staffCanEditMenu && ['/restaurant/categories', '/restaurant/menu'].includes(item.to)) {
        return true;
      }
      return false;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* ======================================================== */}
      {/* MODERN VERTICAL LEFT SIDEBAR                             */}
      {/* ======================================================== */}
      <aside
        className={cn(
          'sticky top-0 h-screen border-r border-border bg-card flex flex-col justify-between transition-all duration-300 z-40 shrink-0 select-none',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Top App Header & Logo */}
        <div>
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            {!isCollapsed && (
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-display text-lg font-bold text-primary truncate">
                  DineSync <span className="text-foreground">AI</span>
                </span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0', badgeColor)}>
                  {portalBadge}
                </span>
              </div>
            )}
            {isCollapsed && (
              <span className="font-display text-lg font-bold text-primary mx-auto">
                DS
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation Links Grouped */}
          <div className="py-4 px-2 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin">
            {/* Dashboard Root Button */}
            <NavLink
              to={dashboardTarget}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
              title={isCollapsed ? 'Dashboard Overview' : undefined}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Dashboard Overview</span>}
            </NavLink>

            {visibleGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                    {group.group}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer User Section */}
        <div className="border-t border-border p-3 bg-card/50">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{restaurant?.name || user?.email}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log out
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 mx-auto text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH TOP HEADER BAR                   */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card sticky top-0 z-30 h-16 flex items-center justify-between px-6 shadow-xs">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
            {description && <p className="text-xs text-muted-foreground hidden sm:block">{description}</p>}
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate(dashboardTarget)} className="text-xs">
              Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
