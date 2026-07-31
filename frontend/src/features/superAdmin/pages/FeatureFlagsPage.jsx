import { useState, useEffect } from 'react';
import { ToggleLeft, Building2, Check, Sparkles, QrCode, Heart, Package, Tv, PieChart } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import * as superAdminApi from '../api/superAdmin.api';

export default function FeatureFlagsPage() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [flags, setFlags] = useState({
    aiFeaturesEnabled: true,
    qrOrderingEnabled: true,
    loyaltyEnabled: true,
    inventoryEnabled: true,
    kitchenDisplayEnabled: true,
    reportsEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadTenants = async () => {
      setIsLoading(true);
      try {
        const res = await superAdminApi.listTenants({ limit: 100 });
        const list = res.tenants || [];
        setTenants(list);
        if (list.length > 0) setSelectedTenantId(list[0]._id);
      } catch { /* non-fatal */ } finally {
        setIsLoading(false);
      }
    };
    loadTenants();
  }, []);

  useEffect(() => {
    const loadFlags = async () => {
      if (!selectedTenantId) return;
      try {
        const res = await superAdminApi.getFeatureFlags(selectedTenantId);
        if (res) setFlags(res);
      } catch { /* non-fatal */ }
    };
    loadFlags();
  }, [selectedTenantId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    setIsSaving(true);
    setSaved(false);
    try {
      await superAdminApi.updateFeatureFlags(selectedTenantId, flags);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* non-fatal */ } finally {
      setIsSaving(false);
    }
  };

  const toggle = (key) => setFlags({ ...flags, [key]: !flags[key] });

  return (
    <SuperAdminLayout title="Granular Feature Flags Management" description="Enable or disable specific modules per restaurant tenant.">
      <div className="space-y-6 max-w-full">
        {isLoading && <Loader />}

        {!isLoading && tenants.length > 0 && (
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block">Select Target Tenant Restaurant</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background"
              >
                {tenants.map((t) => (
                  <option key={t._id} value={t._id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              {[
                { key: 'aiFeaturesEnabled', label: 'AI & Predictive Intelligence Platform', desc: 'Forecasts, recommendations, sentiment analysis', icon: Sparkles },
                { key: 'qrOrderingEnabled', label: 'Customer QR Ordering & Digital Menu', desc: 'Table scanning, digital menu browsing, self-checkout', icon: QrCode },
                { key: 'loyaltyEnabled', label: 'Customer Loyalty & CRM Rewards', desc: 'Points accrual/redemption & membership tiers', icon: Heart },
                { key: 'inventoryEnabled', label: 'Inventory & Stock Management', desc: 'Recipe consumption, purchases, waste tracking', icon: Package },
                { key: 'kitchenDisplayEnabled', label: 'Kitchen Display System (KDS)', desc: 'Station routing & prep order status monitors', icon: Tv },
                { key: 'reportsEnabled', label: 'Reports & Business Intelligence', desc: 'Sales, financial ledgers, scheduled email digests', icon: PieChart },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className="text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={flags[item.key]}
                      onChange={() => toggle(item.key)}
                      className="w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              {saved && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check size={14} /> Feature Flags Saved!</span>}
              <Button type="submit" disabled={isSaving} size="sm" className="ml-auto text-xs">
                {isSaving ? 'Saving...' : 'Save Tenant Feature Flags'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </SuperAdminLayout>
  );
}
