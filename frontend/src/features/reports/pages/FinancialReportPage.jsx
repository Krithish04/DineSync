import { useState, useEffect, useCallback } from 'react';
import { DollarSign, CreditCard, TrendingUp, Percent, Receipt } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import SummaryCard from '../components/SummaryCard';
import ChartWidget from '../components/ChartWidget';
import ReportFilters from '../components/ReportFilters';
import ExportToolbar from '../components/ExportToolbar';
import * as reportsApi from '../api/reports.api';
import * as branchApi from '@/features/branch/api/branch.api';

const today = new Date();
const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const defaultEnd = today.toISOString().slice(0, 10);

export default function FinancialReportPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [filters, setFilters] = useState({ startDate: defaultStart, endDate: defaultEnd });
  const [branches, setBranches] = useState([]);
  const [financial, setFinancial] = useState(null);
  const [gstData, setGstData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch { /* non-fatal */ }
  }, [restaurantId]);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    const params = { startDate: filters.startDate, endDate: filters.endDate, branch: filters.branch || undefined };
    try {
      const [finRes, gstRes, pmRes] = await Promise.all([
        reportsApi.getFinancialSummary(restaurantId, params),
        reportsApi.getGstReport(restaurantId, params),
        reportsApi.getPaymentMethodSummary(restaurantId, params),
      ]);
      setFinancial(finRes);
      setGstData(gstRes || []);
      setPaymentMethods(pmRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load financial data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, filters]);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadData(); }, [loadData]);

  const gstChartData = gstData.map((g) => ({
    month: g._id,
    CGST: g.cgst,
    SGST: g.sgst,
    IGST: g.igst,
    totalTax: g.totalTax,
  }));

  const pmChartData = paymentMethods.map((pm) => ({
    name: pm._id || 'Unknown',
    amount: pm.totalAmount,
    count: pm.transactions,
  }));

  const gstExport = gstData.map((g) => ({
    Month: g._id,
    'Taxable Amount (₹)': g.taxableAmount?.toFixed(2),
    'CGST (₹)': g.cgst?.toFixed(2),
    'SGST (₹)': g.sgst?.toFixed(2),
    'IGST (₹)': g.igst?.toFixed(2),
    'Total Tax (₹)': g.totalTax?.toFixed(2),
    Invoices: g.invoices,
  }));

  return (
    <RestaurantLayout title="Financial Reports" description="Revenue, expenses, profit margins, GST tax audit, and payment method summaries.">
      <div className="space-y-6 max-w-full">
        <ReportFilters filters={filters} onChange={setFilters} branches={branches} />

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && financial && (
          <>
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Gross Revenue" value={financial.totalRevenue} prefix="₹" variant="info" description={`${financial.invoiceCount} paid invoices`} />
              <SummaryCard label="Expenses (Purchases)" value={financial.totalExpenses} prefix="₹" variant="warning" description="Total stock purchase spend" />
              <SummaryCard label="Net Profit" value={financial.grossProfit} prefix="₹" variant={financial.grossProfit >= 0 ? 'success' : 'danger'} description={`Profit Margin: ${financial.profitMargin}%`} />
              <SummaryCard label="Refunds Processed" value={financial.totalRefunded} prefix="₹" variant="danger" description="Full invoice refunds" />
            </div>

            {/* Tax & Discount Breakdown */}
            <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-medium">CGST (2.5%)</span>
                <p className="text-xl font-bold font-display text-foreground mt-0.5">₹{(financial.taxSummary?.cgst || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-medium">SGST (2.5%)</span>
                <p className="text-xl font-bold font-display text-foreground mt-0.5">₹{(financial.taxSummary?.sgst || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-medium">Total Tax Collected</span>
                <p className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-0.5">₹{(financial.taxSummary?.totalTax || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-medium">Discounts Granted</span>
                <p className="text-xl font-bold font-display text-amber-600 dark:text-amber-400 mt-0.5">₹{(financial.taxSummary?.totalDiscount || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Payment Method Breakdown + GST Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Payment Method Breakdown</h2>
                <ChartWidget
                  type="donut"
                  data={pmChartData}
                  nameKey="name"
                  valueKey="amount"
                  height={260}
                  emptyLabel="No payment method data."
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">GST Collection Trend</h2>
                <ChartWidget
                  type="bar"
                  data={gstChartData}
                  xKey="month"
                  dataKeys={[
                    { key: 'CGST', label: 'CGST', color: '#c2440f' },
                    { key: 'SGST', label: 'SGST', color: '#82b34e' },
                  ]}
                  height={260}
                  emptyLabel="No GST trend data."
                />
              </div>
            </div>

            {/* GST Monthly Audit Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Monthly GST Ledger Audit</h2>
                <ExportToolbar data={gstExport} fileName="gst-monthly-audit" title="Monthly GST Audit Ledger" />
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Month</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Taxable Amt</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">CGST</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">SGST</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total Tax</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstData.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No GST data found for the selected period.</td></tr>
                    ) : gstData.map((g, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{g._id}</td>
                        <td className="px-4 py-3 text-right">₹{g.taxableAmount?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">₹{g.cgst?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">₹{g.sgst?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">₹{g.totalTax?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{g.invoices}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
