import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Users, LayoutGrid, DollarSign, ExternalLink, HardDrive, ShoppingBag } from 'lucide-react';
import RestaurantLayout from '../components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import useBranchStore from '@/store/branch.store';
import * as branchApi from '../api/branch.api';
import CreateBranchModal from '../components/CreateBranchModal';

export default function AdminBranchDashboardPage() {
  const navigate = useNavigate();
  const { user, restaurant } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const restaurantId = restaurant?._id || user?.restaurant?._id || (typeof user?.restaurant === 'string' ? user.restaurant : null);

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await branchApi.getBranchDashboardSummary(restaurantId);
      setDashboardData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load multi-branch dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const branches = dashboardData?.branches || [];

  const filteredBranches = branches.filter((b) => {
    if (!selectedBranchId || selectedBranchId === 'all') return true;
    return b.branch?._id === selectedBranchId;
  });

  // Chain totals (Filtered by selected branch or Overall Chain)
  const totalChainRevenue = filteredBranches.reduce((sum, b) => sum + (b.todaySnapshot?.revenue || 0), 0);
  const totalChainOrders = filteredBranches.reduce((sum, b) => sum + (b.todaySnapshot?.orderCount || 0), 0);
  const totalChainStaff = filteredBranches.reduce((sum, b) => sum + (b.todaySnapshot?.staffOnShift || 0), 0);
  const totalChainActiveTables = filteredBranches.reduce((sum, b) => sum + (b.todaySnapshot?.activeTables || 0), 0);

  const isAllView = !selectedBranchId || selectedBranchId === 'all';

  return (
    <RestaurantLayout title="Multi-Branch Management" description="Chain-level overview: monitor branch health, manager assignments, and plan limits.">
      <div className="space-y-6 max-w-full">
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div>
            <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <Building2 className="text-purple-600" size={22} />
              Chain Command Center ({branches.length} {branches.length === 1 ? 'Branch' : 'Branches'})
            </h2>
            <p className="text-xs text-muted-foreground">
              Subscription Tier: <span className="font-bold text-purple-700 uppercase">{dashboardData?.planCode || 'starter'}</span> (One subscription covering all chain locations)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {branches.length > 0 && (
              <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-xl">
                <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Filter Branch:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="all">🏢 All Branches (Overall Chain Revenue)</option>
                  {branches.map((item) => (
                    <option key={item.branch._id} value={item.branch._id}>
                      📍 {item.branch.name} ({item.branch.code || 'MAIN'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-md"
            >
              <Plus size={16} /> Add New Branch
            </Button>
          </div>
        </div>

        {/* Chain Overview Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {isAllView ? 'Overall Chain Today Revenue' : 'Branch Today Revenue'}
              </p>
              <p className="text-lg font-extrabold text-foreground">₹{totalChainRevenue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {isAllView ? "Chain Today's Total Orders" : "Branch Today's Orders"}
              </p>
              <p className="text-lg font-extrabold text-foreground">{totalChainOrders}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
              <LayoutGrid size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Active Occupied Tables</p>
              <p className="text-lg font-extrabold text-foreground">{totalChainActiveTables}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Staff Currently On Shift</p>
              <p className="text-lg font-extrabold text-foreground">{totalChainStaff}</p>
            </div>
          </div>
        </div>

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {/* Branch Cards Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredBranches.length === 0 ? (
              <div className="col-span-2 bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground space-y-3">
                <Building2 size={40} className="mx-auto text-muted-foreground/50" />
                <p className="font-semibold text-sm">No matching branch locations found.</p>
                <Button onClick={() => setSelectedBranchId('all')} size="sm" variant="outline">
                  View All Branches
                </Button>
              </div>
            ) : (
              filteredBranches.map((item) => {
                const b = item.branch;
                const m = item.manager;
                const snap = item.todaySnapshot;
                const limits = item.limitsConsumption;

                const formattedAddress = typeof b.address === 'object' && b.address
                  ? [b.address.line1, b.address.line2, b.address.city, b.address.state, b.address.postalCode].filter(Boolean).join(', ')
                  : (b.address || 'Address registered');

                return (
                  <div key={b._id} className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 hover:border-purple-300 transition-colors">
                    {/* Branch Name & Status */}
                    <div className="flex items-start justify-between border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">{b.name}</h3>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-semibold">
                            {b.code || 'BR-MAIN'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formattedAddress}</p>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          b.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {b.status || 'Active'}
                      </span>
                    </div>

                    {/* Assigned Manager Card */}
                    <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground">Assigned Branch Manager (1:1)</p>
                        <p className="font-bold text-foreground">{m?.name || 'Unassigned'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{m?.email || 'N/A'}</p>
                      </div>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-lg border border-purple-200">
                        Manager Account
                      </span>
                    </div>

                    {/* Today's Snapshot Grid */}
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground mb-2">Today's Live Snapshot</p>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-background border border-border p-2 rounded-xl">
                          <p className="text-[10px] text-muted-foreground font-medium">Tables</p>
                          <p className="font-extrabold text-foreground">{snap.activeTables} / {snap.totalTables}</p>
                        </div>
                        <div className="bg-background border border-border p-2 rounded-xl">
                          <p className="text-[10px] text-muted-foreground font-medium">Staff Shift</p>
                          <p className="font-extrabold text-foreground">{snap.staffOnShift}</p>
                        </div>
                        <div className="bg-background border border-border p-2 rounded-xl">
                          <p className="text-[10px] text-muted-foreground font-medium">Orders</p>
                          <p className="font-extrabold text-foreground">{snap.orderCount}</p>
                        </div>
                        <div className="bg-background border border-border p-2 rounded-xl">
                          <p className="text-[10px] text-muted-foreground font-medium">Revenue</p>
                          <p className="font-extrabold text-emerald-600">₹{snap.revenue}</p>
                        </div>
                      </div>
                    </div>

                    {/* Plan Limits Consumption Progress */}
                    <div className="space-y-2 pt-1 border-t border-border text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                          <span>User Accounts Limit</span>
                          <span>{limits.usersUsed} / {limits.userLimit} Users</span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, (limits.usersUsed / limits.userLimit) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                          <span>Storage Quota</span>
                          <span>{limits.storageUsedMb} MB / {limits.storageLimitMb} MB</span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, (limits.storageUsedMb / limits.storageLimitMb) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Drill-down Quick Links */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBranchId(b._id);
                          navigate(`/restaurant/tables?branch=${b._id}`);
                        }}
                        className="h-7 text-[11px] gap-1 px-2 text-purple-700 hover:bg-purple-50 font-semibold"
                      >
                        <ExternalLink size={12} /> Floor Plan
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBranchId(b._id);
                          navigate(`/kds?branch=${b._id}`);
                        }}
                        className="h-7 text-[11px] gap-1 px-2 text-blue-700 hover:bg-blue-50 font-semibold"
                      >
                        <ExternalLink size={12} /> KDS
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBranchId(b._id);
                          navigate(`/restaurant/employees/dashboard?branch=${b._id}`);
                        }}
                        className="h-7 text-[11px] gap-1 px-2 text-amber-700 hover:bg-amber-50 font-semibold"
                      >
                        <ExternalLink size={12} /> Staff
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBranchId(b._id);
                          navigate(`/restaurant/employees/payroll?branch=${b._id}`);
                        }}
                        className="h-7 text-[11px] gap-1 px-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                      >
                        <ExternalLink size={12} /> Payroll
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Create Branch Modal */}
        <CreateBranchModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={fetchSummary}
        />
      </div>
    </RestaurantLayout>
  );
}
