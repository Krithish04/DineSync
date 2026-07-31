import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, Star, Landmark, Award, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '../api/customer.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function CustomerDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load CRM details
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedBranch !== 'all') params.branch = selectedBranch;

      const [statsRes, reportsRes] = await Promise.all([
        customerApi.getCustomerStats(restaurantId, params),
        customerApi.getCustomerReports(restaurantId),
      ]);
      setStats(statsRes);
      setReports(reportsRes);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
    }
  }, [restaurantId, loadBranches]);

  useEffect(() => {
    if (restaurantId) {
      loadDashboardData();
    }
  }, [restaurantId, selectedBranch, loadDashboardData]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Overview of customer registrations, repeat retention ratios, and loyalty tiers."
    >
      <div className="space-y-8">
        {/* Controls header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground shrink-0">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none min-w-[170px]"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/customers/list')} className="h-8">
              <Users className="h-4 w-4 mr-1.5" /> Customers Directory
            </Button>
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/customers/loyalty')} className="h-8">
              <Award className="h-4 w-4 mr-1.5" /> Loyalty Point Ledger
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <Loader label="Opening CRM console..." />
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Total Customers</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats?.totalCustomers || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Repeat rate %</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                      {reports?.repeatRate ? `${reports.repeatRate}%` : '0%'}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Loyalty Members</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats?.loyaltyMembers || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Award className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Points Liability</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                      {(reports?.totalLoyaltyBalance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 col-span-2 lg:col-span-1">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Average spent</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                      ₹{reports?.averageCLV?.toFixed(2) || 0}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Landmark className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard tables split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top spent Customers list */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Star className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500" />
                    Top Customers (by spent ₹)
                  </CardTitle>
                  <CardDescription className="text-xs">Premium restaurant patrons contributing to lifetime values.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!stats?.topCustomers || stats.topCustomers.length === 0) ? (
                    <p className="text-center py-6 text-xs text-muted-foreground italic border rounded">
                      No customer spend transactions processed yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                            <th className="pb-2 font-medium">Patron Name</th>
                            <th className="pb-2 font-medium text-center">Tier</th>
                            <th className="pb-2 font-medium text-center">Visits</th>
                            <th className="pb-2 font-medium text-center">Points</th>
                            <th className="pb-2 font-medium text-right">AOV (₹)</th>
                            <th className="pb-2 font-medium text-right font-bold text-foreground">Total spent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topCustomers.map((c) => (
                            <tr key={c._id} className="border-b border-border last:border-none hover:bg-muted/5 transition-colors">
                              <td className="py-2.5">
                                <div>
                                  <span className="font-semibold text-foreground">{c.fullName}</span>
                                  <p className="text-[10px] text-muted-foreground">{c.phoneNumber}</p>
                                </div>
                              </td>
                              <td className="py-2.5 text-center font-mono">
                                <span className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase ${
                                  c.membershipTier === 'Platinum' ? 'bg-violet-100 text-violet-800 border-violet-200' :
                                  c.membershipTier === 'Gold' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  c.membershipTier === 'Silver' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                                  'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                  {c.membershipTier}
                                </span>
                              </td>
                              <td className="py-2.5 text-center font-mono">{c.visitCount}</td>
                              <td className="py-2.5 text-center font-mono text-muted-foreground">{c.loyaltyPoints}</td>
                              <td className="py-2.5 text-right font-mono text-muted-foreground">₹{c.averageOrderValue?.toFixed(2)}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-foreground">₹{c.totalSpent?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Growth registrations report */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-primary" />
                    Customer Registrations
                  </CardTitle>
                  <CardDescription className="text-xs">Patron sign-ups growth timeline tracker.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!reports?.growthTimeline || reports.growthTimeline.length === 0) ? (
                    <p className="text-center py-6 text-xs text-muted-foreground italic border rounded">
                      No monthly registrations logged.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {reports.growthTimeline.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-muted-foreground font-mono">{item.period}</span>
                          <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded border">
                            {item.registrations} patrons registered
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
export { Users };
