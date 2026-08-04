import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ClipboardList, Eye } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as orderApi from '../api/order.api';

export default function OrderHistoryPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Load historical orders list
  const loadOrdersHistory = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: searchDebounced,
      };

      if (selectedStatus !== 'all') params.orderStatus = selectedStatus;
      if (selectedPayment !== 'all') params.paymentStatus = selectedPayment;

      const result = await orderApi.listOrders(restaurantId, params);
      setOrders(result.items || []);
      setPagination(result.pagination || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order history.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, page, searchDebounced, selectedStatus, selectedPayment]);

  useEffect(() => {
    if (restaurantId) {
      loadOrdersHistory();
    }
  }, [restaurantId, loadOrdersHistory]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="View, search, and audit past customer order files."
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Order History Logs</CardTitle>
          <CardDescription>Paginated directory of all invoices and checkout logs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Filters controls bar */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="relative col-span-1 sm:col-span-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order number or item contents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="all">All Order Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready</option>
                <option value="Served">Served</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="relative">
              <select
                value={selectedPayment}
                onChange={(e) => {
                  setSelectedPayment(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Historical Order Items List table */}
          {isLoading ? (
            <Loader label="Loading history list..." />
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
              <ClipboardList className="h-8 w-8 text-muted-foreground opacity-55" />
              <p className="text-sm text-muted-foreground">No historical orders match your parameters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border rounded-lg bg-card">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
                      <th className="p-3 font-medium">Order Number</th>
                      <th className="p-3 font-medium">Order Type</th>
                      <th className="p-3 font-medium text-center">Items Count</th>
                      <th className="p-3 font-medium text-right">Grand Total</th>
                      <th className="p-3 font-medium text-center">Status</th>
                      <th className="p-3 font-medium text-center">Payment</th>
                      <th className="p-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                            {o.orderNumber}
                          </span>
                        </td>
                        <td className="p-3 text-xs font-semibold text-foreground">
                          {o.orderType}
                          {o.table && ` (T-${o.table.tableNumber})`}
                        </td>
                        <td className="p-3 text-center text-xs text-muted-foreground">
                          {o.items.reduce((s, item) => s + item.quantity, 0)} items
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">
                          ₹{o.grandTotal.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            o.orderStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                            o.orderStatus === 'Cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-semibold capitalize border ${
                            o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            o.paymentStatus === 'Refunded' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => navigate(`/restaurant/orders/${o._id}`)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders logged)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </RestaurantLayout>
  );
}
