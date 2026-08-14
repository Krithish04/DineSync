import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Table as TableIcon, CheckCircle2, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import CustomerAuthModal from '../components/CustomerAuthModal';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import * as customerApi from '../api/customerPlatform.api';

import QrCodeRequiredCard from '../components/QrCodeRequiredCard';

export default function CheckoutPage() {
  const navigate = useNavigate();

  const {
    restaurantId,
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
    isInactiveTable,
    tableStatus,
  } = useCartStore();

  const customer = useCustomerAuthStore((state) => state.customer);
  const isAuthenticated = Boolean(customer || tableHost);

  const [customerName, setCustomerName] = useState(tableHost?.name || customer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(tableHost?.phone || customer?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [error, setError] = useState('');

  const grandTotal = getGrandTotal();
  const isInactive = isInactiveTable || tableStatus === 'Inactive';
  const hasContext = Boolean(restaurantId && tableId);

  if (!hasContext) {
    return (
      <CustomerLayout title="Checkout">
        <QrCodeRequiredCard message="Please scan your table's QR code to proceed with checkout." />
      </CustomerLayout>
    );
  }

  useEffect(() => {
    if (tableHost) {
      if (!customerName) setCustomerName(tableHost.name);
      if (!customerPhone) setCustomerPhone(tableHost.phone);
    } else if (customer) {
      if (!customerName) setCustomerName(customer.fullName || '');
      if (!customerPhone) setCustomerPhone(customer.phoneNumber || '');
    }
  }, [tableHost, customer, customerName, customerPhone]);

  const submitOrder = async (overrideHost = null) => {
    const activeHost = overrideHost || tableHost;
    const activeName = activeHost?.name || customer?.fullName || customerName;
    const activePhone = activeHost?.phone || customer?.phoneNumber || customerPhone;

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Place order ticket to Kitchen (KDS)
      const order = await customerApi.placeCustomerOrder(restaurantId, {
        branchId,
        tableId,
        orderType,
        items,
        customerName: activeName || 'Guest',
        customerPhone: activePhone || '9999999999',
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

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (isInactive) {
      setError(`Table ${tableNumber ? `#${tableNumber}` : ''} is currently inactive and cannot place active table orders. Please contact restaurant staff.`);
      return;
    }
    if (isViewOnly) {
      setError('Table session is claimed by another diner. You are in View-Only mode.');
      return;
    }
    if (!items || items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    await submitOrder();
  };

  const handleAuthSuccess = async (hostInfo) => {
    setIsAuthModalOpen(false);
    await submitOrder(hostInfo);
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

        {/* Verified Table Host Information or Sign-In Prompt */}
        {isAuthenticated ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs text-primary font-semibold">Verified Table Host</p>
                <p className="text-sm font-bold text-foreground">{tableHost?.name || customer?.fullName || 'Diner'}</p>
                <p className="text-xs text-muted-foreground">{tableHost?.phone || customer?.phoneNumber || ''}</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={12} /> OTP Verified
            </span>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Phone Verification Required</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in with your mobile number to host this table session and send orders to the kitchen.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full text-xs font-semibold gap-2 h-9"
            >
              <span>Sign In with Phone OTP to Order</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        )}

        {orderType === 'Delivery' && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Delivery Address</label>
            <textarea
              required
              placeholder="Enter complete house/building address..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full border border-border rounded-xl p-3 text-base sm:text-sm bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {/* Continuous Loop Banner Info */}
        <div className="bg-muted/40 border border-border rounded-2xl p-4 flex items-center gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h5 className="font-bold text-foreground">Kitchen Order Dispatch</h5>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sending items directly to the kitchen. You can continue adding more dishes anytime during your dining session. Settle final bill when finished!
            </p>
          </div>
        </div>

        {/* Total & Send to Kitchen Button */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Batch Order Total</span>
            <p className="text-xl font-bold font-display text-primary">₹{grandTotal.toFixed(2)}</p>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || isViewOnly}
            className="gap-2 text-sm sm:text-base h-12 px-6 font-bold rounded-xl active:scale-[0.99] touch-manipulation"
          >
            <span>
              {isSubmitting
                ? 'Sending to Kitchen...'
                : !isAuthenticated
                ? 'Sign In & Send Order'
                : 'Send Order to Kitchen'}
            </span>
            <ArrowRight size={18} />
          </Button>
        </div>
      </form>

      {/* Customer Phone OTP Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </CustomerLayout>
  );
}
