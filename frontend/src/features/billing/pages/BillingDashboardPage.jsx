import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Landmark, Coins, TrendingUp, Plus, Receipt } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as billingApi from '../api/billing.api';

export default function BillingDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load billing dashboard metrics
  const loadDashboardData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const [statsRes, reportsRes, invoicesRes] = await Promise.all([
        billingApi.getBillingStats(restaurantId),
        billingApi.getFinanceReports(restaurantId),
        billingApi.listInvoices(restaurantId, { limit: 5 }),
      ]);
      
      setStats(statsRes);
      setReports(reportsRes);
      setRecentInvoices(invoicesRes.items || invoicesRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load billing metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadDashboardData();
    }
  }, [restaurantId, loadDashboardData]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Sales ledger metrics, GST summaries, and payment transactions auditing."
    >
      <div className="space-y-8">
        {/* Navigation Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Billing & Finance Dashboard</h2>

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
          <Loader label="Opening financial ledger..." />
        ) : (
          <>
            {/* KPI Counts Grid */}
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Today Revenue</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">₹{stats?.todayRevenue?.toFixed(2) || 0}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Month Revenue</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">₹{stats?.monthRevenue?.toFixed(2) || 0}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">GST Tax Liability</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">₹{stats?.gstCollected?.toFixed(2) || 0}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Landmark className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase">Avg Ticket Size</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">₹{stats?.avgTicketSize?.toFixed(2) || 0}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Coins className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Method Breakdown & Recent Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h4 className="font-bold text-sm text-foreground">Payment Method Split</h4>
                  <div className="space-y-3">
                    {reports?.paymentBreakdown?.map((item) => (
                      <div key={item.method} className="flex justify-between items-center text-xs border-b border-border/40 pb-2 last:border-none">
                        <span className="font-semibold text-foreground">{item.method}</span>
                        <span className="font-mono font-bold text-foreground">₹{item.total.toFixed(2)} ({item.count} tx)</span>
                      </div>
                    ))}
                    {(!reports?.paymentBreakdown || reports.paymentBreakdown.length === 0) && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">No payment transactions recorded.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Invoices */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-foreground">Recent Invoices</h4>
                    <Button variant="ghost" size="xs" onClick={() => navigate('/restaurant/billing/invoices')} className="text-xs text-primary">View All</Button>
                  </div>
                  <div className="space-y-3">
                    {recentInvoices.map((inv) => (
                      <div key={inv._id} className="flex justify-between items-center text-xs border-b border-border/40 pb-2 last:border-none">
                        <div>
                          <p className="font-mono font-bold text-foreground">{inv.invoiceNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{inv.customerName || 'Walk-in Guest'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-foreground">₹{inv.grandTotal?.toFixed(2)}</p>
                          <span className={`inline-flex rounded-full px-2 py-0.2 text-[8px] font-bold uppercase ${
                            inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                    {recentInvoices.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">No recent invoices.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
