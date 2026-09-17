import { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Sparkles, ArrowUpRight } from 'lucide-react';
import RestaurantLayout from '../components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import useAuthStore from '@/features/auth/store/auth.store';
import api from '@/lib/axios';

export default function TenantSubscriptionPage() {
  const { restaurant } = useAuthStore();
  const restaurantId = restaurant?._id;

  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/restaurants/${restaurantId}/subscription`);
      setSubscription(data.data.subscription);
      setPlans(data.data.plans || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subscription plan details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = async (planCode) => {
    if (subscription?.planCode === planCode) return;
    setIsUpdating(true);
    setError('');
    setSuccessMessage('');
    try {
      const { data } = await api.patch(`/restaurants/${restaurantId}/subscription`, { planCode });
      setSubscription(data.data.subscription);
      setSuccessMessage(`Successfully updated your restaurant plan to ${planCode.toUpperCase()}!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update subscription plan.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <RestaurantLayout
      title="Subscription & Tier Plan"
      description="View and select your restaurant's active tier plan, staff limits, and feature access."
    >
      <div className="space-y-6 max-w-full">
        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs font-semibold">{error}</div>}
        {successMessage && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-xs font-semibold">{successMessage}</div>}

        {!isLoading && (
          <>
            {/* Active Plan Summary Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current Active Plan</span>
                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="text-2xl font-extrabold text-foreground capitalize font-display">
                      {subscription?.planCode || 'Starter'} Plan
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {subscription?.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-renew: <strong className="text-foreground">{subscription?.autoRenew ? 'Enabled' : 'Disabled'}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Billing</span>
                  <p className="text-2xl font-extrabold text-primary font-display mt-1">
                    ₹{subscription?.planCode === 'pro' ? '4,999' : subscription?.planCode === 'enterprise' ? '9,999' : '1,999'} <span className="text-xs text-muted-foreground font-normal">/ mo</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Available Plan Tiers */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-foreground font-display">Available Subscription Tiers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const isCurrent = subscription?.planCode === plan.code;
                  return (
                    <Card
                      key={plan.code}
                      className={`relative border transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between ${
                        isCurrent
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div>
                          {isCurrent && (
                            <span className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                              Active Plan
                            </span>
                          )}

                          <h4 className="text-lg font-bold text-foreground">{plan.name}</h4>
                          <div className="my-3">
                            <span className="text-3xl font-extrabold text-foreground font-display">₹{plan.priceMonthly?.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-muted-foreground"> / month</span>
                          </div>

                          <ul className="space-y-2.5 text-xs text-muted-foreground my-4">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span>Staff Limit: <strong className="text-foreground">{plan.userLimit === -1 ? 'Unlimited' : `${plan.userLimit} Users`}</strong></span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span>AI Features: <strong className="text-foreground">{plan.aiFeatureAccess}</strong></span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span>Analytics: <strong className="text-foreground">{plan.reportsAccess}</strong></span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span>Storage: <strong className="text-foreground">{Math.round(plan.storageLimitMb / 1024)} GB</strong></span>
                            </li>
                          </ul>
                        </div>

                        <Button
                          variant={isCurrent ? 'outline' : 'default'}
                          size="sm"
                          disabled={isCurrent || isUpdating}
                          onClick={() => handleSelectPlan(plan.code)}
                          className="w-full mt-4 font-semibold text-xs h-9"
                        >
                          {isCurrent ? 'Current Tier' : `Select ${plan.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
