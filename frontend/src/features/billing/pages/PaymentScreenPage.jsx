import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Coins, Percent, Landmark, Receipt } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as orderApi from '@/features/order/api/order.api';
import * as billingApi from '../api/billing.api';

export default function PaymentScreenPage() {
  const { orderId } = useParams();
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Discount inputs
  const [discountVal, setDiscountVal] = useState('0');
  const [couponVal, setCouponVal] = useState('0');
  
  // Loyalty redemption points input
  const [redeemPoints, setRedeemPoints] = useState('');
  const [notes, setNotes] = useState('');

  const loadCheckoutDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const ord = await orderApi.getOrder(restaurantId, orderId);
      setOrder(ord);

      // If customer is linked to order, load customer points balance details
      if (ord.customer) {
        const customerApi = require('@/features/customer/api/customer.api');
        const custDetails = await customerApi.getCustomer(restaurantId, ord.customer);
        setCustomerInfo(custDetails.customer);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load checkout details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, orderId]);

  useEffect(() => {
    if (restaurantId && orderId) {
      loadCheckoutDetails();
    }
  }, [restaurantId, orderId, loadCheckoutDetails]);

  // Real-time Calculations
  const calculations = (() => {
    if (!order) return { subtotal: 0, serviceCharge: 0, cgst: 0, sgst: 0, grandTotal: 0, rounding: 0, loyaltyDiscount: 0 };
    
    const subtotal = order.subtotal || 0;
    const discount = parseFloat(discountVal) || 0;
    const couponDiscount = parseFloat(couponVal) || 0;
    
    // 10 points = ₹1
    const pointsToUse = parseInt(redeemPoints, 10) || 0;
    const loyaltyDiscount = Math.round((pointsToUse / 10) * 100) / 100;

    const totalDiscount = discount + couponDiscount + loyaltyDiscount;
    const taxable = Math.max(0, subtotal - totalDiscount);

    const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;
    const cgst = Math.round(taxable * 0.025 * 100) / 100;
    const sgst = Math.round(taxable * 0.025 * 100) / 100;

    const rawTotal = taxable + serviceCharge + cgst + sgst;
    const grandTotal = Math.round(rawTotal);
    const rounding = Math.round((grandTotal - rawTotal) * 100) / 100;

    return {
      subtotal,
      discount,
      couponDiscount,
      loyaltyDiscount,
      serviceCharge,
      cgst,
      sgst,
      grandTotal,
      rounding,
    };
  })();

  // Generate Invoice
  const handleGenerateInvoice = async () => {
    setError('');
    setIsSaving(true);
    try {
      const payload = {
        orderId,
        discount: calculations.discount,
        couponDiscount: calculations.couponDiscount,
        loyaltyDiscount: calculations.loyaltyDiscount,
        notes: notes.trim(),
      };

      // Generate invoice
      const invoice = await billingApi.generateInvoice(restaurantId, payload);
      
      // Auto navigate cashier to invoice details receipt preview page
      navigate(`/restaurant/billing/invoices/${invoice._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <RestaurantLayout title="POS Checkout">
        <Loader label="Preparing checkout station..." />
      </RestaurantLayout>
    );
  }

  if (error && !order) {
    return (
      <RestaurantLayout title="POS Checkout">
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Calculate discounts, verify CGST/SGST splits, and generate tax bills."
    >
      <div className="space-y-6">
        <button
          onClick={() => navigate('/restaurant/orders/active')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Active Orders
        </button>

        {error && (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Invoice details & modifications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer loyalty checker */}
            {customerInfo && (
              <Card className="border border-yellow-200 bg-yellow-50/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-yellow-800 flex items-center gap-1.5">
                    <Coins className="h-4.5 w-4.5 text-yellow-500 shrink-0" />
                    Customer Loyalty Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-yellow-100">
                    <div>
                      <span className="font-bold text-foreground block">{customerInfo.fullName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{customerInfo.phoneNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-muted-foreground uppercase block text-[9px]">Points balance</span>
                      <span className="font-mono font-black text-sm text-yellow-600">{customerInfo.loyaltyPoints} pts</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="redeem-points">Points to redeem (10 points = ₹1)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="redeem-points"
                        type="number"
                        placeholder="e.g. 500"
                        value={redeemPoints}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (val > customerInfo.loyaltyPoints) {
                            setRedeemPoints(customerInfo.loyaltyPoints.toString());
                          } else {
                            setRedeemPoints(e.target.value);
                          }
                        }}
                        className="font-mono text-xs w-28 h-9"
                      />
                      <span className="text-xs text-muted-foreground mt-2">
                        ₹{calculations.loyaltyDiscount.toFixed(2)} discount value
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom discount inputs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Percent className="h-4 w-4" /> Discounts adjustments
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="flat-discount">Cashier discount (₹)</Label>
                  <Input
                    id="flat-discount"
                    type="number"
                    min="0"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    className="font-mono text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="coupon-discount">Coupon discount (₹)</Label>
                  <Input
                    id="coupon-discount"
                    type="number"
                    min="0"
                    value={couponVal}
                    onChange={(e) => setCouponVal(e.target.value)}
                    className="font-mono text-xs h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice items breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Receipt className="h-4 w-4" /> Placed Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-border/20 pb-2 last:border-none last:pb-0">
                    <span className="font-semibold text-foreground">
                      {item.itemName} <span className="font-mono text-primary font-bold">x{item.quantity}</span>
                    </span>
                    <span className="font-mono text-foreground font-semibold">₹{(item.quantity * item.unitPrice).toFixed(0)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary box */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Checkout Billing Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="space-y-1.5 border-b border-border/40 pb-3 font-mono">
                  <div className="flex justify-between">
                    <span>Items subtotal:</span>
                    <span>₹{calculations.subtotal.toFixed(2)}</span>
                  </div>

                  {(calculations.discount + calculations.couponDiscount + calculations.loyaltyDiscount) > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Total discounts:</span>
                      <span>
                        -₹{(calculations.discount + calculations.couponDiscount + calculations.loyaltyDiscount).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Service Charge (5%):</span>
                    <span>₹{calculations.serviceCharge.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>CGST (2.5%):</span>
                    <span>₹{calculations.cgst.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>SGST (2.5%):</span>
                    <span>₹{calculations.sgst.toFixed(2)}</span>
                  </div>

                  {calculations.rounding !== 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Rounding:</span>
                      <span>
                        {calculations.rounding > 0 ? `+₹${calculations.rounding}` : `-₹${Math.abs(calculations.rounding)}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-sm font-extrabold pb-3 border-b border-border/40 font-mono">
                  <span>Grand Total:</span>
                  <span className="text-base text-foreground">₹{calculations.grandTotal.toFixed(0)}</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="checkout-notes">Billing Remarks</Label>
                  <textarea
                    id="checkout-notes"
                    placeholder="e.g. Split payment, corporate discount..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="flex w-full rounded border border-input bg-background px-3 py-2 text-[11px] min-h-[45px]"
                  />
                </div>

                <Button
                  size="sm"
                  className="w-full text-xs h-9 gap-1.5 mt-2"
                  onClick={handleGenerateInvoice}
                  isLoading={isSaving}
                >
                  <Receipt className="h-4 w-4" /> Generate Invoice Bill
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}
export { Gift, Coins, Percent, Landmark, Receipt };
