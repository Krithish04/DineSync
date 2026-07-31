import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Receipt, ArrowLeft, Filter } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as billingApi from '../api/billing.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function InvoiceListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
      if (res.items?.length > 0) {
        setSelectedBranch(res.items[0]._id);
      }
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load invoices list
  const loadInvoicesList = useCallback(async () => {
    if (!selectedBranch) return;
    setIsLoading(true);
    setError('');
    try {
      const params = { branch: selectedBranch };
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const res = await billingApi.listInvoices(restaurantId, params);
      setInvoices(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices directory.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch, selectedStatus]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
    }
  }, [restaurantId, loadBranches]);

  useEffect(() => {
    if (selectedBranch) {
      loadInvoicesList();
    }
  }, [selectedBranch, selectedStatus, loadInvoicesList]);

  // Search filter
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.fullName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [invoices, search]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Tax invoice lists search, payment statuses, and detail reviews."
    >
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle>Invoices Ledger Directory</CardTitle>
          <CardDescription>Archive directory of all created tax invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Filtering row */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none min-w-[160px]"
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Invoice Statuses</option>
                <option value="Generated">Generated</option>
                <option value="Paid">Paid</option>
                <option value="Refunded">Refunded</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice no or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Invoices table display */}
          {isLoading ? (
            <Loader label="Opening ledgers index..." />
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded bg-muted/5">
              No invoices created inside this branch matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Invoice Number</th>
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium text-center">Table / Order</th>
                    <th className="p-3 font-medium text-right">Subtotal (₹)</th>
                    <th className="p-3 font-medium text-right font-bold text-foreground">Grand Total (₹)</th>
                    <th className="p-3 font-medium text-center">Status</th>
                    <th className="p-3 font-medium text-center">Date</th>
                    <th className="p-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {inv.customer?.fullName || 'Walk-In Customer'}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {inv.table ? `Table ${inv.table.tableNumber}` : 'Takeaway'}
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        ₹{inv.subtotal?.toFixed(0)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        ₹{inv.grandTotal?.toFixed(0)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold border uppercase ${
                          inv.invoiceStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          inv.invoiceStatus === 'Refunded' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {inv.invoiceStatus}
                        </span>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {new Date(inv.invoiceDate).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => navigate(`/restaurant/billing/invoices/${inv._id}`)}
                        >
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}
