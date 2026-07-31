import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Users, HardDrive, CreditCard, ArrowLeft, ShieldCheck, Check } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import Loader from '@/components/common/Loader';
import ForecastCard from '@/features/ai/components/ForecastCard';
import { Button } from '@/components/ui/button';
import * as superAdminApi from '../api/superAdmin.api';

export default function TenantDetailsPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await superAdminApi.getTenantDetails(tenantId);
      setDetails(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tenant details.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const restaurant = details?.restaurant;
  const subscription = details?.subscription;

  return (
    <SuperAdminLayout title="Tenant Deep-Dive Details" description="Inspect usage statistics, storage allocation, branches, and subscription status.">
      <div className="space-y-6 max-w-full">
        <Button variant="outline" size="sm" onClick={() => navigate('/super-admin/tenants')} className="gap-1.5 text-xs">
          <ArrowLeft size={14} /> Back to Tenant List
        </Button>

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && details && (
          <>
            {/* Restaurant Profile Header Card */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-display text-foreground">{restaurant.name}</h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    restaurant.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {restaurant.isActive ? 'Active Tenant' : 'Suspended'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Slug: <code className="font-mono">{restaurant.slug}</code> | Phone: {restaurant.phone || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Owner: {restaurant.owner?.fullName || 'N/A'} ({restaurant.owner?.email})</p>
              </div>

              <Button onClick={() => navigate(`/super-admin/feature-flags`)} size="sm" variant="outline" className="text-xs">
                Manage Feature Flags
              </Button>
            </div>

            {/* Usage Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ForecastCard title="Active Branches" value={details.branchesCount} icon={Building2} variant="primary" />
              <ForecastCard title="Registered Staff Users" value={details.usersCount} icon={Users} variant="emerald" />
              <ForecastCard title="Est. Storage Used" value={details.storageUsageMb} suffix=" MB" icon={HardDrive} variant="amber" />
              <ForecastCard title="Subscription Plan" value={subscription?.planCode?.toUpperCase()} icon={CreditCard} variant="purple" />
            </div>

            {/* Billing Ledger History */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">SaaS Platform Billing History</h4>
              <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Invoice #</th>
                      <th className="text-left px-3 py-2 font-semibold">Date</th>
                      <th className="text-right px-3 py-2 font-semibold">Amount</th>
                      <th className="text-center px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subscription?.billingHistory || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No billing ledger history found.</td></tr>
                    ) : (
                      subscription.billingHistory.map((b, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-mono font-medium">{b.invoiceNumber}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(b.billingDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-3 py-2 text-right font-bold">₹{b.amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{b.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
