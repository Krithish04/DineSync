import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Receipt } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as billingApi from '../api/billing.api';

export default function InvoiceListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load invoices list
  const loadInvoicesList = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await billingApi.listInvoices(restaurantId);
      setInvoices(res.items || res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load billing invoices.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadInvoicesList();
    }
  }, [restaurantId, loadInvoicesList]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || inv.paymentStatus === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, selectedStatus]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Tax invoices, billing receipts, and payment status history."
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Billing & Tax Invoices</CardTitle>
          <CardDescription>Archive of customer order invoices and tax compliance receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 border-b border-border/40 pb-4">
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or customer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Invoices Table */}
          {isLoading ? (
            <Loader label="Mapping billing ledger..." />
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
              <Receipt className="h-8 w-8 text-muted-foreground opacity-55" />
              <p className="text-sm text-muted-foreground">No billing invoices found matching current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Invoice Number</th>
                    <th className="p-3 font-medium">Customer Name</th>
                    <th className="p-3 font-medium text-center">Payment Method</th>
                    <th className="p-3 font-medium text-right">Taxable (₹)</th>
                    <th className="p-3 font-medium text-right">GST Tax (₹)</th>
                    <th className="p-3 font-medium text-right">Grand Total (₹)</th>
                    <th className="p-3 font-medium text-center">Status</th>
                    <th className="p-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                      <td className="p-3 font-mono font-semibold text-foreground">{inv.invoiceNumber}</td>
                      <td className="p-3 text-foreground font-medium">{inv.customerName || 'Walk-in Guest'}</td>
                      <td className="p-3 text-center text-muted-foreground">{inv.paymentMethod || 'Cash'}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">₹{inv.subtotal?.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">₹{inv.taxAmount?.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">₹{inv.grandTotal?.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                          inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          inv.paymentStatus === 'Refunded' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => navigate(`/restaurant/billing/${inv._id}`)}
                          className="h-7 text-[10px] px-2.5"
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
