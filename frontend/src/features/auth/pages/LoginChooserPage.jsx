import { Link, useNavigate } from 'react-router-dom';
import { Building2, ChefHat, ArrowRight } from 'lucide-react';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Card, CardContent } from '@/components/ui/card';

const PORTALS = [
  {
    id: 'restaurant',
    title: 'Restaurant Team',
    subtitle: 'Owners, Managers & Floor Staff',
    description: 'Manage menu, seating, orders, inventory, billing, and staff operations.',
    badge: 'Owner / Manager / Staff',
    to: '/login/restaurant',
    icon: Building2,
    accentClass: 'border-primary/30 group-hover:border-primary text-primary bg-primary/10',
  },
  {
    id: 'kitchen',
    title: 'Kitchen Staff',
    subtitle: 'Chefs & Line Cooks',
    description: 'Touch-optimized Kitchen Display System (KDS) for real-time ticket updates.',
    badge: 'Chef KDS',
    to: '/login/kitchen',
    icon: ChefHat,
    accentClass: 'border-amber-500/30 group-hover:border-amber-500 text-amber-600 bg-amber-500/10',
  },
];

export default function LoginChooserPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Sign in to DineSync AI"
      description="Choose your role-specific portal to continue"
      footer={
        <>
          Don&apos;t have a restaurant on DineSync yet?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {PORTALS.map((portal) => {
          const Icon = portal.icon;
          return (
            <Card
              key={portal.id}
              onClick={() => navigate(portal.to)}
              className="group relative cursor-pointer border-border hover:border-primary/60 hover:shadow-md transition-all duration-200"
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`p-3 rounded-xl border shrink-0 transition-colors ${portal.accentClass}`}>
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                      {portal.title}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground shrink-0">
                      {portal.badge}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    {portal.subtitle}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2">
                    {portal.description}
                  </p>
                </div>

                <div className="self-center text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">
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
