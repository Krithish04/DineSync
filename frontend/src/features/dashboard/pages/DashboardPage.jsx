import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  Table as TableIcon,
  Calendar,
  ShoppingBag,
  ChefHat,
  Package,
  Users,
  Settings,
  CreditCard,
  UserCheck,
  TrendingUp,
  Brain,
  ShieldAlert,
  LogOut,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/features/notification/components/NotificationBell';
import useAuthStore from '@/features/auth/store/auth.store';
import * as authApi from '@/features/auth/api/auth.api';

export default function DashboardPage() {
  const { user, restaurant, clearSession } = useAuthStore();
  const navigate = useNavigate();

  const role = user?.role || 'manager';
  const isAdmin = ['owner', 'super_admin'].includes(role);
  const isManager = role === 'manager';

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      <header className="border-b border-border bg-card sticky top-0 z-30 shadow-xs">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-semibold text-primary">
              DineSync <span className="text-foreground">AI</span>
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 capitalize">
              {role.replace('_', ' ')} Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 max-w-7xl">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-border">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? 'Executive overview of restaurant settings, billing, staff, reports, and AI analytics.'
                : 'Manager operational hub for tables, menu, reservations, orders, kitchen, and inventory.'}
            </p>
          </div>

          {restaurant && (
            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">{restaurant.name}</p>
                <p className="text-[11px] text-muted-foreground">Slug: {restaurant.slug}</p>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MANAGER DASHBOARD — OPERATIONAL HUB                      */}
        {/* ======================================================== */}
        {isManager && (
          <div className="mt-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Operational Modules</h2>
                <p className="text-xs text-muted-foreground">Manage your daily restaurant floor and back-of-house operations.</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Tables */}
              <Card className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/restaurant/tables')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold group-hover:text-primary">Tables & Layout</CardTitle>
                    <TableIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-xs">Seating capacity, indoor/outdoor areas & occupancy</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="secondary" className="w-full text-xs">Manage Tables</Button>
                </CardContent>
              </Card>

              {/* Menu */}
              <Card className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/restaurant/menu')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold group-hover:text-primary">Menu & Categories</CardTitle>
                    <Utensils className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-xs">Dishes, modifiers, prices & dietary categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="secondary" className="w-full text-xs">Manage Menu</Button>
                </CardContent>
              </Card>

              {/* Reservations */}
              <Card className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/restaurant/reservations/dashboard')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold group-hover:text-primary">Reservations</CardTitle>
                    <Calendar className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-xs">Table bookings, guest check-ins & calendar grid</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="secondary" className="w-full text-xs">Manage Bookings</Button>
                </CardContent>
              </Card>

              {/* Orders */}
              <Card className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/restaurant/orders/dashboard')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold group-hover:text-primary">Orders & Sales POS</CardTitle>
                    <ShoppingBag className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-xs">POS register, active tickets & bill splitting</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="secondary" className="w-full text-xs">Open POS Register</Button>
                </CardContent>
              </Card>

              {/* Kitchen */}
              <Card className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/restaurant/kitchen')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold group-hover:text-primary">Kitchen (KDS)</CardTitle>
                    <ChefHat className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-xs">Live kitchen monitor, prep timers & ticket dispatch</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="secondary" className="w-full text-xs">Open Kitchen Display</Button>
                </CardContent>
              </Card>

              {/* Inventory */}
              <Card className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/restaurant/inventory/dashboard')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold group-hover:text-primary">Inventory & Stock</CardTitle>
                    <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-xs">Ingredient balances, low-stock alerts & purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="secondary" className="w-full text-xs">Check Inventory</Button>
                </CardContent>
              </Card>

              {/* Customers */}
              <Card className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/restaurant/customers/dashboard')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold group-hover:text-primary">Customers & CRM</CardTitle>
                    <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-xs">Patron profiles, preferences & loyalty rewards</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="secondary" className="w-full text-xs">View CRM Directory</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ADMIN & OWNER DASHBOARD — EXECUTIVE HUB                  */}
        {/* ======================================================== */}
        {isAdmin && (
          <div className="mt-8 space-y-10">
            {/* Section 1: Business Administration */}
            <div>
              <h2 className="text-xl font-semibold text-foreground">Restaurant Administration</h2>
              <p className="text-xs text-muted-foreground mb-4">Manage legal profile, GST, branch locations, and system configuration.</p>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/profile')}>
                  <CardHeader className="pb-3">
                    <Settings className="h-5 w-5 text-primary mb-1" />
                    <CardTitle className="text-sm font-semibold">Restaurant Profile</CardTitle>
                    <CardDescription className="text-xs">Name, logo, cover image & info</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/gst')}>
                  <CardHeader className="pb-3">
                    <Building2 className="h-5 w-5 text-primary mb-1" />
                    <CardTitle className="text-sm font-semibold">GST & Tax Config</CardTitle>
                    <CardDescription className="text-xs">GSTIN, legal name & tax rates</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/branches')}>
                  <CardHeader className="pb-3">
                    <Building2 className="h-5 w-5 text-primary mb-1" />
                    <CardTitle className="text-sm font-semibold">Branch Outlets</CardTitle>
                    <CardDescription className="text-xs">Multi-location restaurant branches</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/settings')}>
                  <CardHeader className="pb-3">
                    <Settings className="h-5 w-5 text-primary mb-1" />
                    <CardTitle className="text-sm font-semibold">General Settings</CardTitle>
                    <CardDescription className="text-xs">Currency, timezone & prefixes</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Section 2: Financials, Staff & Analytics */}
            <div>
              <h2 className="text-xl font-semibold text-foreground">Financials, Staff & Intelligence</h2>
              <p className="text-xs text-muted-foreground mb-4">Billing ledgers, employee payroll, executive BI, and predictive AI.</p>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/billing/dashboard')}>
                  <CardHeader className="pb-3">
                    <CreditCard className="h-5 w-5 text-purple-500 mb-1" />
                    <CardTitle className="text-sm font-semibold">Billing & Payments</CardTitle>
                    <CardDescription className="text-xs">Invoices, refunds & sales tax</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/employees/dashboard')}>
                  <CardHeader className="pb-3">
                    <UserCheck className="h-5 w-5 text-emerald-500 mb-1" />
                    <CardTitle className="text-sm font-semibold">Employees & Staff</CardTitle>
                    <CardDescription className="text-xs">Staff directory, attendance & leave</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/reports/executive')}>
                  <CardHeader className="pb-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mb-1" />
                    <CardTitle className="text-sm font-semibold">Executive Reports</CardTitle>
                    <CardDescription className="text-xs">Revenue, customer & profit KPIs</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/restaurant/ai/dashboard')}>
                  <CardHeader className="pb-3">
                    <Sparkles className="h-5 w-5 text-amber-500 mb-1" />
                    <CardTitle className="text-sm font-semibold">AI Intelligence</CardTitle>
                    <CardDescription className="text-xs">Sales forecasts & demand prediction</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Section 3: Operational Quick Jump */}
            <div className="p-6 bg-card rounded-xl border border-border">
              <h3 className="text-base font-semibold text-foreground mb-1">Operational Quick Launch</h3>
              <p className="text-xs text-muted-foreground mb-4">Direct jump to manager operational screens.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate('/restaurant/tables')}>
                  <TableIcon className="h-3.5 w-3.5 mr-1.5" /> Tables
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/restaurant/menu')}>
                  <Utensils className="h-3.5 w-3.5 mr-1.5" /> Menu
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/restaurant/reservations/dashboard')}>
                  <Calendar className="h-3.5 w-3.5 mr-1.5" /> Reservations
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/restaurant/orders/dashboard')}>
                  <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Orders
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/restaurant/kitchen')}>
                  <ChefHat className="h-3.5 w-3.5 mr-1.5" /> Kitchen (KDS)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Super Admin SaaS shortcut banner if super_admin */}
        {role === 'super_admin' && (
          <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs font-semibold text-purple-900 dark:text-purple-100">Super Admin Platform Controls Available</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">Access multi-tenant controls, tenant billing, subscription plans, and platform audit logs.</p>
              </div>
            </div>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs" onClick={() => navigate('/super-admin/dashboard')}>
              Go to Super Admin Portal
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
