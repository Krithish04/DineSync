import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, RefreshCw, Layers, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Loader from '@/components/common/Loader';
import BillSummary from '../components/BillSummary';
import useAuthStore from '@/features/auth/store/auth.store';
import * as orderApi from '../api/order.api';

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [mergeableOrders, setMergeableOrders] = useState([]);
  const [selectedMergeId, setSelectedMergeId] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load Order Details
  const loadOrderDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await orderApi.getOrder(restaurantId, orderId);
      setOrder(res);

      // If active and bound to a table, load other orders for the same table to support merging!
      if (res.table && ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(res.orderStatus)) {
        const othersRes = await orderApi.listOrders(restaurantId, {
          branch: res.branch?._id || res.branch,
          limit: 50,
        });
        const activeOthers = (othersRes.items || []).filter(
          (o) =>
            o._id !== res._id &&
            o.table?._id === res.table._id &&
            ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.orderStatus)
        );
        setMergeableOrders(activeOthers);
      } else {
        setMergeableOrders([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, orderId]);

  useEffect(() => {
    if (restaurantId && orderId) {
      loadOrderDetails();
    }
  }, [restaurantId, orderId, loadOrderDetails]);

  // Advance Order Status
  const handleStatusChange = async (newStatus) => {
    setError('');
    setSuccess('');
    setIsProcessingAction(true);
    try {
      const updated = await orderApi.updateOrderStatus(restaurantId, orderId, newStatus);
      setOrder(updated);
      setSuccess(`Order status updated to ${newStatus}.`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Process Checkout Payment
  const handlePayment = async () => {
    setError('');
    setSuccess('');
    setIsProcessingAction(true);
    try {
      const updated = await orderApi.updatePaymentStatus(restaurantId, orderId, 'Paid');
      setOrder(updated);
      setSuccess('Payment collected! Order status marked Completed and Table released.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process payment.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Bill splitting handler
  const handleBillSplit = async (splitPayload) => {
    setError('');
    setSuccess('');
    setIsProcessingAction(true);
    try {
      const result = await orderApi.splitBill(restaurantId, orderId, splitPayload);
      if (result.splitType === 'equal') {
        setSuccess(`Equal split calculated: ₹${result.splitAmount} per head for ${result.splitCount} guests.`);
      } else {
        setSuccess(`Successfully split selected items into a new order: ${result.splitOrder.orderNumber}`);
        // Reload details of current (original) order
        loadOrderDetails();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to split bill.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Merge order action
  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMergeId) return;

    setError('');
    setSuccess('');
    setIsProcessingAction(true);
    try {
      const merged = await orderApi.mergeOrders(restaurantId, orderId, [selectedMergeId]);
      setOrder(merged);
      setSelectedMergeId('');
      setSuccess('Orders merged successfully!');
      loadOrderDetails();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to merge orders.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="View, advance, and settle order accounts."
    >
      <div className="space-y-6">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {success}
          </div>
        )}

        {isLoading ? (
          <Loader label="Loading invoice details..." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: Invoice details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3 border-b border-border bg-muted/10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-2 py-0.5">
                        {order.orderNumber}
                      </span>
                      <h4 className="font-bold text-base text-foreground mt-1.5">
                        {order.orderType}
                        {order.table && ` • Table ${order.table.tableNumber}`}
                      </h4>
                    </div>

                    {/* Controls advancements */}
                    {canManage && order.orderStatus !== 'Cancelled' && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {order.orderStatus === 'Pending' && (
                          <Button size="xs" onClick={() => handleStatusChange('Accepted')} disabled={isProcessingAction}>
                            Accept Order
                          </Button>
                        )}
                        {order.orderStatus === 'Accepted' && (
                          <Button size="xs" onClick={() => handleStatusChange('Preparing')} className="bg-orange-600 hover:bg-orange-700" disabled={isProcessingAction}>
                            Start Preparation
                          </Button>
                        )}
                        {order.orderStatus === 'Preparing' && (
                          <Button size="xs" onClick={() => handleStatusChange('Ready')} className="bg-purple-600 hover:bg-purple-700" disabled={isProcessingAction}>
                            Mark Ready
                          </Button>
                        )}
                        {order.orderStatus === 'Ready' && (
                          <Button size="xs" onClick={() => handleStatusChange('Served')} className="bg-teal-600 hover:bg-teal-700" disabled={isProcessingAction}>
                            Mark Served
                          </Button>
                        )}
                        {order.orderStatus === 'Served' && order.paymentStatus === 'Paid' && (
                          <Button size="xs" onClick={() => handleStatusChange('Completed')} className="bg-emerald-600 hover:bg-emerald-700" disabled={isProcessingAction}>
                            Complete Order
                          </Button>
                        )}
                        
                        {order.paymentStatus === 'Pending' && (
                          <Button size="xs" onClick={handlePayment} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" disabled={isProcessingAction}>
                            <CreditCard className="h-3.5 w-3.5" /> Cash Checkout
                          </Button>
                        )}

                        {['Pending', 'Accepted'].includes(order.orderStatus) && (
                          <Button size="xs" variant="outline" onClick={() => handleStatusChange('Cancelled')} className="text-destructive hover:bg-rose-50 border-rose-200" disabled={isProcessingAction}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                          <th className="pb-3 font-medium">Item Details</th>
                          <th className="pb-3 font-medium text-center">Qty</th>
                          <th className="pb-3 font-medium text-right">Price</th>
                          <th className="pb-3 font-medium text-center">Kitchen status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item._id} className="border-b border-border last:border-none">
                            <td className="py-4">
                              <p className="font-semibold text-foreground">{item.itemName}</p>
                              {item.modifiers.length > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Mods: {item.modifiers.map((m) => `${m.optionName} (+₹${m.price})`).join(', ')}
                                </p>
                              )}
                              {item.specialInstructions && (
                                <p className="text-[10px] text-amber-700 italic mt-0.5">
                                  *{item.specialInstructions}
                                </p>
                              )}
                            </td>
                            <td className="py-4 text-center font-semibold text-foreground">
                              x{item.quantity}
                            </td>
                            <td className="py-4 text-right font-mono font-medium text-foreground">
                              ₹{((item.unitPrice + item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity).toFixed(2)}
                            </td>
                            <td className="py-4 text-center">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                item.kitchenStatus === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                item.kitchenStatus === 'Preparing' ? 'bg-orange-100 text-orange-800' :
                                item.kitchenStatus === 'Ready' ? 'bg-purple-100 text-purple-800' :
                                'bg-teal-100 text-teal-800'
                              }`}>
                                {item.kitchenStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {order.notes && (
                    <div className="mt-4 p-3 bg-muted/40 rounded border border-border/50 text-xs">
                      <span className="font-bold text-foreground block mb-0.5">Notes:</span>
                      <p className="text-muted-foreground">{order.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Merge Orders Card */}
              {canManage && mergeableOrders.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Layers className="h-4.5 w-4.5 text-primary" />
                      Merge Seating Orders
                    </CardTitle>
                    <CardDescription className="text-xs">Combine other active order item lists for this table into the current order.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleMergeSubmit} className="flex gap-3 items-end">
                      <div className="space-y-1.5 flex-1 max-w-sm">
                        <Label htmlFor="merge-order-select" className="text-xs text-muted-foreground">Select Order to Merge:</Label>
                        <select
                          id="merge-order-select"
                          value={selectedMergeId}
                          onChange={(e) => setSelectedMergeId(e.target.value)}
                          className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-xs focus:outline-none"
                          required
                        >
                          <option value="">Choose order...</option>
                          {mergeableOrders.map((o) => (
                            <option key={o._id} value={o._id}>
                              {o.orderNumber} (₹{o.grandTotal.toFixed(2)} • {o.orderStatus})
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" size="sm" className="h-9 text-xs" isLoading={isProcessingAction}>
                        Merge Into Current
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Invoice Calculations Breakdown */}
            <div className="lg:col-span-1">
              <BillSummary
                order={order}
                onSplit={handleBillSplit}
                isProcessingSplit={isProcessingAction}
              />
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
