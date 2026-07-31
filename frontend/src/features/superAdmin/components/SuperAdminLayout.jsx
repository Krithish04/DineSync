import { NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, Building2, CreditCard, ToggleLeft, FileText, Activity, LineChart, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ADMIN_TABS = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/super-admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/super-admin/subscriptions', label: 'Subscription Plans', icon: CreditCard },
  { to: '/super-admin/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
  { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { to: '/super-admin/analytics', label: 'Platform Analytics', icon: LineChart },
  { to: '/super-admin/monitoring', label: 'System Health', icon: Activity },
];

export default function SuperAdminLayout({ title, description, children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Super Admin Platform Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <ShieldCheck size={20} />
            </span>
            <div>
              <span className="font-display text-lg font-bold text-primary">DineSync AI</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                Super Admin Portal
              </span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5 text-xs">
            <ArrowLeft size={14} /> Back to Restaurant App
          </Button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="container py-8 flex-1 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 bg-card border border-border rounded-xl p-3 h-fit space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
            SaaS Platform Controls
          </p>
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </aside>

        {/* Content Body */}
        <main className="flex-1 space-y-4 max-w-full">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <div className="mt-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
