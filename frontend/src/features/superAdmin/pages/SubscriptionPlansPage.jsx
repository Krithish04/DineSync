import { useState, useEffect } from 'react';
import { CreditCard, Check, Sparkles, Building2, Users, HardDrive } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import * as superAdminApi from '../api/superAdmin.api';

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await superAdminApi.listSubscriptionPlans();
        setPlans(res || []);
      } catch { /* non-fatal */ } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <SuperAdminLayout title="SaaS Subscription Plans & Pricing Tiers" description="Manage plan configurations, user limits, branch limits, storage limits, and AI feature access.">
      <div className="space-y-6 max-w-full">
        {isLoading && <Loader />}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.code}
                className={`bg-card border rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm relative ${
                  plan.code === 'pro' ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                {plan.code === 'pro' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <div className="space-y-2">
                  <h3 className="text-lg font-bold font-display text-foreground">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-display text-primary">₹{plan.priceMonthly?.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Yearly Plan: ₹{plan.priceYearly?.toLocaleString('en-IN')} / yr</p>
                </div>

                <div className="space-y-2 text-xs border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span><strong>{plan.userLimit === -1 ? 'Unlimited' : plan.userLimit}</strong> Staff Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span><strong>{plan.branchLimit === -1 ? 'Unlimited' : plan.branchLimit}</strong> Branch Locations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span><strong>{plan.storageLimitMb / 1024} GB</strong> Storage Limit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>AI Features: <strong>{plan.aiFeatureAccess} Access</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>Reports & Analytics: <strong>{plan.reportsAccess} Access</strong></span>
                  </div>
                </div>

                <Button variant={plan.code === 'pro' ? 'default' : 'outline'} size="sm" className="w-full text-xs">
                  Active Plan Configuration
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
