import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Table as TableIcon, CheckCircle2, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';

export default function CheckoutPage() {
  const navigate = useNavigate();

  const {
    restaurantId = '66aa11112222333344445555',
    branchId,
    tableId,
    tableNumber,
    orderType,
    items,
    specialInstructions,
    getGrandTotal,
    clearCart,
    tableHost,
    addPlacedOrder,
    isViewOnly,
  } = useCartStore();

  const [customerName, setCustomerName] = useState(tableHost?.name || '');
  const [customerPhone, setCustomerPhone] = useState(tableHost?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const grandTotal = getGrandTotal();

  useEffect(() => {
    if (tableHost) {
      if (!customerName) setCustomerName(tableHost.name);
      if (!customerPhone) setCustomerPhone(tableHost.phone);
    }
  }, [tableHost, customerName, customerPhone]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (isViewOnly) {
      setError('Table session is claimed by another diner. You are in View-Only mode.');
      return;
    }
    if (!items || items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Place order ticket to Kitchen (KDS)
      const order = await customerApi.placeCustomerOrder(restaurantId, {
        branchId,
        tableId,
        orderType,
        items,
        customerName: customerName || tableHost?.name || 'Guest',
        customerPhone: customerPhone || tableHost?.phone || '9999999999',
        notes: specialInstructions,
      });

      // 2. Record placed order in host's continuous loop session
      addPlacedOrder(order);

      // 3. Clear current cart items so diner can add more dishes in continuous loop
      clearCart();

      // 4. Return to digital menu in continuous ordering loop!
      navigate('/menu/browse');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout title="Confirm Order">
      <form onSubmit={handlePlaceOrder} className="space-y-4">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs">{error}</div>}

        {/* Order Details Header */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground uppercase font-medium">Order Type</span>
            <p className="text-sm font-bold text-foreground">{orderType || 'Dine-In'}</p>
          </div>
          {tableNumber && (
            <div className="flex items-center gap-1 text-primary bg-primary/10 px-2.5 py-1 rounded-full font-semibold">
              <TableIcon size={14} /> Table #{tableNumber}
            </div>
          )}
        </div>

        {/* Verified Table Host Information */}
        {tableHost ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs text-primary font-semibold">Verified Table Host</p>
                <p className="text-sm font-bold text-foreground">{tableHost.name}</p>
                <p className="text-xs text-muted-foreground">{tableHost.phone}</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={12} /> OTP Verified
            </span>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Contact Information</h4>
            <div className="space-y-2">
              <input
                type="text"
                required
                placeholder="Your Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background"
              />
              <input
                type="tel"
                required
                placeholder="Phone Number *"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background"
              />
            </div>
          </div>
        )}

        {orderType === 'Delivery' && (
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Delivery Address</label>
            <textarea
              required
              placeholder="Enter complete house/building address..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full border border-border rounded-lg p-2 text-xs bg-background resize-none h-16"
            />
          </div>
        )}

        {/* Continuous Loop Banner Info */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-center gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h5 className="font-bold text-foreground">Kitchen Order Dispatch</h5>
            <p className="text-[11px] text-muted-foreground">
              Sending items directly to the kitchen. You can continue adding more dishes anytime during your dining session. Settle final bill when finished!
            </p>
          </div>
        </div>

        {/* Total & Send to Kitchen Button */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Batch Order Total</span>
            <p className="text-xl font-bold font-display text-primary">₹{grandTotal.toFixed(2)}</p>
          </div>
          <Button type="submit" disabled={isSubmitting || isViewOnly} className="gap-2 text-xs px-5 font-bold">
            <span>{isSubmitting ? 'Sending to Kitchen...' : 'Send Order to Kitchen'}</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </CustomerLayout>
  );
}
