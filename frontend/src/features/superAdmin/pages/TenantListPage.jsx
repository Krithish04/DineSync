import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, ShieldCheck, CheckCircle2, PauseCircle, Trash2, Eye } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import * as superAdminApi from '../api/superAdmin.api';

export default function TenantListPage() {
  const navigate = useNavigate();

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

  return (
    <SuperAdminLayout title="Tenant Management" description="Approve, monitor, suspend, or reactivate multi-tenant restaurant workspaces.">
      <div className="space-y-4 max-w-full">
        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by restaurant name, email, or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-xl bg-card text-foreground"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-xs bg-card"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Restaurant Tenant</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cuisine</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No restaurant tenants found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <p className="text-sm font-bold text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">slug: {t.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{t.owner?.fullName || 'N/A'}</p>
                        <p className="text-[10px] text-muted-foreground">{t.owner?.email || t.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(t.cuisine || []).join(', ') || 'General Dining'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold border ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
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
      </div>
    </SuperAdminLayout>
  );
}
