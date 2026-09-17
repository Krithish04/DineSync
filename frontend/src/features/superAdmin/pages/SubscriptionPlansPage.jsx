import { useState, useEffect, useCallback } from 'react';
import { Check, Edit3, Save, X } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as superAdminApi from '../api/superAdmin.api';

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({
    priceMonthly: 0,
    priceYearly: 0,
    userLimit: 5,
    storageLimitMb: 2048,
    aiFeatureAccess: 'Basic',
    reportsAccess: 'Basic',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.listSubscriptionPlans();
      setPlans(res || []);
    } catch { /* non-fatal */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      priceMonthly: plan.priceMonthly || 0,
      priceYearly: plan.priceYearly || 0,
      userLimit: plan.userLimit ?? 5,
      storageLimitMb: plan.storageLimitMb || 2048,
      aiFeatureAccess: plan.aiFeatureAccess || 'Basic',
      reportsAccess: plan.reportsAccess || 'Basic',
    });
    setError('');
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      await superAdminApi.updateSubscriptionPlanConfig(editingPlan.code, {
        priceMonthly: Number(form.priceMonthly),
        priceYearly: Number(form.priceYearly),
        userLimit: Number(form.userLimit),
        storageLimitMb: Number(form.storageLimitMb),
        aiFeatureAccess: form.aiFeatureAccess,
        reportsAccess: form.reportsAccess,
      });

      setSuccessMessage(`Successfully updated ${editingPlan.name} configuration!`);
      setEditingPlan(null);
      loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SuperAdminLayout title="SaaS Subscription Plans & Pricing Tiers" description="Manage tier plan pricing, staff limits, storage limits, and AI feature access levels across the platform.">
      <div className="space-y-6 max-w-full">
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-xs font-semibold">
            {successMessage}
          </div>
        )}

        {isLoading && <Loader />}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.code}
                className={`bg-card border rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm relative transition-all ${
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

                <div className="space-y-2.5 text-xs border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span><strong>{plan.userLimit === -1 ? 'Unlimited' : plan.userLimit}</strong> Staff Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span><strong>{Math.round(plan.storageLimitMb / 1024)} GB</strong> Storage Limit</span>
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

                <Button
                  variant={plan.code === 'pro' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleOpenEdit(plan)}
                  className="w-full text-xs font-bold gap-1.5 h-9"
                >
                  <Edit3 size={13} /> Edit Plan Pricing & Limits
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Edit Plan Modal */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display font-bold text-lg text-foreground">Edit {editingPlan?.name} Configuration</h3>
                <button onClick={() => setEditingPlan(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-xs">{error}</div>}

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="priceMonthly" className="text-xs">Monthly Price (₹)</Label>
                    <Input
                      id="priceMonthly"
                      type="number"
                      value={form.priceMonthly}
                      onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="priceYearly" className="text-xs">Yearly Price (₹)</Label>
                    <Input
                      id="priceYearly"
                      type="number"
                      value={form.priceYearly}
                      onChange={(e) => setForm({ ...form, priceYearly: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="userLimit" className="text-xs">Staff Limit (-1 for unlimited)</Label>
                    <Input
                      id="userLimit"
                      type="number"
                      value={form.userLimit}
                      onChange={(e) => setForm({ ...form, userLimit: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="storageLimitMb" className="text-xs">Storage Limit (MB)</Label>
                    <Input
                      id="storageLimitMb"
                      type="number"
                      value={form.storageLimitMb}
                      onChange={(e) => setForm({ ...form, storageLimitMb: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="aiFeatureAccess" className="text-xs">AI Feature Level</Label>
                    <select
                      id="aiFeatureAccess"
                      value={form.aiFeatureAccess}
                      onChange={(e) => setForm({ ...form, aiFeatureAccess: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-card text-foreground"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Full">Full</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reportsAccess" className="text-xs">Reports Access</Label>
                    <select
                      id="reportsAccess"
                      value={form.reportsAccess}
                      onChange={(e) => setForm({ ...form, reportsAccess: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-card text-foreground"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Full">Full</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingPlan(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={isSaving} className="gap-1.5 font-bold">
                    <Save size={14} /> Save Configuration
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
