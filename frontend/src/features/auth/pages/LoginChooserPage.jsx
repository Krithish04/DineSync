import { Link, useNavigate } from 'react-router-dom';
import { Building2, ChefHat, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Card, CardContent } from '@/components/ui/card';

const PORTALS = [
  {
    id: 'super_admin',
    title: 'Super Admin Console',
    subtitle: 'SaaS Platform Owner & System Administrators',
    description: 'Global multi-tenant dashboard, tenant approval queue, subscription tiers & system health monitoring.',
    badge: 'Super Admin',
    to: '/login/admin',
    icon: ShieldCheck,
    iconGlow: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-500/25',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    cardGlow: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
    arrowColor: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
  },
  {
    id: 'restaurant',
    title: 'Restaurant Team',
    subtitle: 'Owners, Managers & Floor Staff',
    description: 'Manage menu catalog, seating floorplan, live orders, inventory stock, billing, and staff operations.',
    badge: 'Owner / Manager / Staff',
    to: '/login/restaurant',
    icon: Building2,
    iconGlow: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/25',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    cardGlow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    arrowColor: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
  },
  {
    id: 'kitchen',
    title: 'Kitchen Display (KDS)',
    subtitle: 'Chefs & Line Cooks',
    description: 'Touch-optimized Kitchen Display System for real-time ticket SLA tracking & stock updates.',
    badge: 'Chef KDS',
    to: '/login/kitchen',
    icon: ChefHat,
    iconGlow: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    cardGlow: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
    arrowColor: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
  },
];

export default function LoginChooserPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Sign in to DineSync AI"
      description="Select your role-specific portal to log in"
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <span>Don&apos;t have a restaurant on DineSync yet?</span>
          <Link
            to="/register"
            className="font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-4 transition-colors"
          >
            Create one
          </Link>
        </div>
      }
    >
      <div className="space-y-3.5">
        {PORTALS.map((portal) => {
          const Icon = portal.icon;
          return (
            <Card
              key={portal.id}
              onClick={() => navigate(portal.to)}
              className={`group relative cursor-pointer border-border/80 bg-card/70 hover:bg-card/95 transition-all duration-300 transform hover:-translate-y-0.5 rounded-xl ${portal.cardGlow}`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Glowing Role Icon */}
                <div className={`p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-105 ${portal.iconGlow}`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Role Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors font-display">
                      {portal.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${portal.badgeClass}`}>
                      {portal.badge}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    {portal.subtitle}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed">
                    {portal.description}
                  </p>
                </div>

                {/* Interactive Arrow Indicator */}
                <div className={`shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 ${portal.arrowColor}`}>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AuthLayout>
  );
}
