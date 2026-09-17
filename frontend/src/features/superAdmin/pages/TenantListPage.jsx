import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, ShieldCheck, CheckCircle2, PauseCircle, Trash2, Eye, LogIn } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import * as superAdminApi from '../api/superAdmin.api';

export default function TenantListPage() {
  const navigate = useNavigate();
  const { user, setSession } = useAuthStore();

  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await superAdminApi.listTenants({ search, status: statusFilter });
      setTenants(res.tenants || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tenants list.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const handleAction = async (tenantId, action) => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this tenant restaurant?')) return;
    try {
      await superAdminApi.updateTenantStatus(tenantId, action);
      loadTenants();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} tenant.`);
    }
  };

  const handleImpersonate = async (tenant) => {
    try {
      const res = await superAdminApi.impersonateTenant(tenant._id);
      if (res?.token) {
        setSession({ ...user, isImpersonating: true, restaurant: tenant._id, impersonatedRestaurantName: tenant.name }, tenant, res.token);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to impersonate tenant.');
    }
  };

  const handlePlanChange = async (tenantId, newPlanCode) => {
    try {
      setTenants((prev) =>
        prev.map((t) => (t._id === tenantId ? { ...t, subscriptionPlan: newPlanCode } : t))
      );
      await superAdminApi.updateTenantSubscription(tenantId, { planCode: newPlanCode });
      loadTenants();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tenant subscription plan.');
      loadTenants();
    }
  };

  const [selectedTenantIds, setSelectedTenantIds] = useState([]);
  const [overrideModalTenant, setOverrideModalTenant] = useState(null);
  const [overridePlan, setOverridePlan] = useState('pro');
  const [overrideReason, setOverrideReason] = useState('');


  const toggleSelectAll = () => {
    if (selectedTenantIds.length === tenants.length) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(tenants.map((t) => t._id));
    }
  };

  const toggleSelectTenant = (id) => {
    setSelectedTenantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedTenantIds.length === 0) return;
    if (!confirm(`Are you sure you want to ${action} ${selectedTenantIds.length} selected tenants?`)) return;
    try {
      await superAdminApi.bulkUpdateTenantStatus(selectedTenantIds, action);
      setSelectedTenantIds([]);
      loadTenants();
    } catch (err) {
      alert(err.response?.data?.message || `Failed bulk ${action}`);
    }
  };

  const submitManualOverride = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert('A mandatory reason is required for manual plan overrides.');
      return;
    }
    try {
      await superAdminApi.manualPlanOverride(overrideModalTenant._id, overridePlan, overrideReason);
      setOverrideModalTenant(null);
      setOverrideReason('');
      loadTenants();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit plan override.');
    }
  };

  return (
    <SuperAdminLayout title="Tenant Management" description="Approve, monitor, suspend, reactivate, or change subscription tier plans for restaurant workspaces.">
      <div className="space-y-4 max-w-full">
        {/* Search & Bulk Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by restaurant name, email, or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            {selectedTenantIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800">
                <span>{selectedTenantIds.length} selected</span>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')} className="h-6 text-[10px] bg-white text-amber-700">
                  Suspend All
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('reactivate')} className="h-6 text-[10px] bg-white text-emerald-700">
                  Reactivate All
                </Button>
              </div>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-xs bg-background"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended / Pending Only</option>
            </select>
          </div>
        </div>

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={tenants.length > 0 && selectedTenantIds.length === tenants.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Restaurant Tenant</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Subscription Plan</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No restaurant tenants found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTenantIds.includes(t._id)}
                          onChange={() => toggleSelectTenant(t._id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <p className="text-sm font-bold text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">slug: {t.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{t.owner?.name || t.owner?.fullName || 'N/A'}</p>
                        <p className="text-[10px] text-muted-foreground">{t.owner?.email || t.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 inline-block">
                            {(() => {
                              const c = String(t.subscriptionPlan || 'starter').toLowerCase();
                              if (c === 'pro') return 'Pro Plan (₹4,999)';
                              if (c === 'enterprise') return 'Enterprise Plan (₹9,999)';
                              return 'Starter Plan (₹1,999)';
                            })()}
                          </span>
                          <button
                            onClick={() => {
                              setOverrideModalTenant(t);
                              setOverridePlan(t.subscriptionPlan || 'pro');
                            }}
                            className="text-[10px] text-indigo-600 hover:underline font-semibold"
                          >
                            Override
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold border ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Pending / Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {!t.isActive && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAction(t._id, 'approve')}
                            className="h-7 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                          >
                            <CheckCircle2 size={12} /> Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/super-admin/tenants/${t._id}`)}
                          className="h-7 px-2 text-[10px] gap-1"
                        >
                          <Eye size={12} /> Inspect
                        </Button>
                        {t.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(t._id, 'suspend')}
                            className="h-7 px-2 text-[10px] text-amber-600 hover:bg-amber-50"
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(t._id, 'reactivate')}
                            className="h-7 px-2 text-[10px] text-emerald-600 hover:bg-emerald-50"
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(t._id, 'delete')}
                          className="h-7 px-2 text-[10px] text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Manual Plan Override Modal */}
        {overrideModalTenant && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-foreground">Manual Plan Override (Comp / Support)</h3>
              <p className="text-xs text-muted-foreground">
                Overriding subscription plan for <span className="font-bold text-foreground">{overrideModalTenant.name}</span>.
                This action is logged in audit history under <span className="font-mono text-purple-600">PLAN_MANUALLY_OVERRIDDEN</span>.
              </p>

              <form onSubmit={submitManualOverride} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Select New Tier Plan</label>
                  <select
                    value={overridePlan}
                    onChange={(e) => setOverridePlan(e.target.value)}
                    className="w-full border border-border rounded-xl p-2 text-xs bg-background"
                  >
                    <option value="starter">Starter Plan (₹1,999/mo)</option>
                    <option value="pro">Professional Plan (₹4,999/mo)</option>
                    <option value="enterprise">Enterprise Plan (₹9,999/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Mandatory Override Reason *</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. VIP comp tier upgrade requested by support ticket #4920"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                    className="w-full border border-border rounded-xl p-2.5 text-xs bg-background"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOverrideModalTenant(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                    Submit Override
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

