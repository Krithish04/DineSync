import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Landmark, Coins, TrendingUp, HelpCircle, ArrowUpRight, BarChart2, Plus, Receipt } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as billingApi from '../api/billing.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function BillingDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
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

  // Load billing dashboard metrics
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedBranch !== 'all') params.branch = selectedBranch;

      const [statsRes, reportsRes, invoicesRes] = await Promise.all([
        billingApi.getBillingStats(restaurantId, params),
        billingApi.getFinanceReports(restaurantId),
        billingApi.listInvoices(restaurantId, { ...params, limit: 5 }),
      ]);
      
      setStats(statsRes);
      setReports(reportsRes);
      setRecentInvoices(invoicesRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load billing metrics.');
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
      description="Sales ledger metrics, GST summaries, and payment transactions auditing."
    >
      <div className="space-y-8">
        {/* Navigation Action Bar */}
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
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/billing/invoices')} className="h-8">
              <Receipt className="h-4 w-4 mr-1.5" /> Invoices List
            </Button>
            <Button size="xs" onClick={() => navigate('/restaurant/orders/active')} className="h-8">
              <Plus className="h-4 w-4 mr-1" /> Seated Orders Checkout
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <Loader label="Opening financial terminal..." />
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Total Sales</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">₹{stats?.totalSales?.toLocaleString() || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Ticket AOV</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">₹{stats?.averageTicketSize?.toFixed(0) || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Taxes Collected</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">₹{stats?.totalTaxCollected?.toLocaleString() || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Landmark className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Discounts Given</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">₹{stats?.totalDiscountsGiven?.toLocaleString() || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center">
                    <Coins className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-rose-500 col-span-2 lg:col-span-1">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Refunds processed</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">₹{reports?.refundsTotal?.toLocaleString() || 0}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard tables split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent invoices paid */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="h-4.5 w-4.5 text-primary" />
                    Recent Invoices
                  </CardTitle>
                  <CardDescription className="text-xs">Audit sheet of recently generated customer bills.</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentInvoices.length === 0 ? (
                    <p className="text-center py-6 text-xs text-muted-foreground italic border rounded bg-muted/5">
                      No invoices recorded inside this branch yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                            <th className="pb-2 font-medium">Invoice No</th>
                            <th className="pb-2 font-medium">Customer</th>
                            <th className="pb-2 font-medium text-center">Status</th>
                            <th className="pb-2 font-medium text-right font-bold text-foreground">Total Bill</th>
                            <th className="pb-2 font-medium text-center">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentInvoices.map((inv) => (
                            <tr
                              key={inv._id}
                              className="border-b border-border last:border-none hover:bg-muted/5 transition-colors cursor-pointer"
                              onClick={() => navigate(`/restaurant/billing/invoices/${inv._id}`)}
                            >
                              <td className="py-3">
                                <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                                  {inv.invoiceNumber}
                                </span>
                              </td>
                              <td className="py-3 font-semibold text-foreground">{inv.customer?.fullName || 'Walk-In Patron'}</td>
                              <td className="py-3 text-center">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold border uppercase ${
                                  inv.invoiceStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                  inv.invoiceStatus === 'Refunded' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                  {inv.invoiceStatus}
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-foreground">₹{inv.grandTotal?.toFixed(2)}</td>
                              <td className="py-3 text-center text-muted-foreground">
                                {new Date(inv.invoiceDate).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment methods stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart2 className="h-4.5 w-4.5 text-primary" />
                    Payment Distributions
                  </CardTitle>
                  <CardDescription className="text-xs">Transaction channels values breakdown.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!stats?.paymentBreakdown || stats.paymentBreakdown.length === 0) ? (
                    <p className="text-center py-6 text-xs text-muted-foreground italic border rounded">
                      No payments processed yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.paymentBreakdown.map((item, idx) => (
                        <div key={idx} className="space-y-1 text-xs">
                          <div className="flex justify-between font-semibold">
                            <span className="text-muted-foreground">{item.method}</span>
                            <span className="font-mono text-foreground">₹{item.amount.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((item.amount / (stats.totalSales || 1)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
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
export { DollarSign };
