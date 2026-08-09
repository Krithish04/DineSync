import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, Gift } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import CouponSelector from '../components/CouponSelector';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';

import QrCodeRequiredCard from '../components/QrCodeRequiredCard';

export default function CartPage() {
  const navigate = useNavigate();

  const {
    restaurantId,
    tableId,
    items,
    updateQuantity,
    removeItem,
    specialInstructions,
    setSpecialInstructions,
    getSubtotal,
    getTax,
    getServiceCharge,
    getDiscount,
    getGrandTotal,
    tableNumber,
  } = useCartStore();

  const hasContext = Boolean(restaurantId && tableId);

  if (!hasContext) {
    return (
      <CustomerLayout title="Your Cart">
        <QrCodeRequiredCard message="Please scan your table's QR code to view and manage your cart." />
      </CustomerLayout>
    );
  }

  const subtotal = getSubtotal();
  const tax = getTax();
  const serviceCharge = getServiceCharge();
  const discount = getDiscount();
  const grandTotal = getGrandTotal();

  return (
    <CustomerLayout title="Your Cart">
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
            <ShoppingBag size={40} className="text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">Your order cart is empty</h3>
            <p className="text-xs text-muted-foreground">Add delicious dishes from our menu to place an order.</p>
            <Button size="sm" onClick={() => navigate('/menu/browse')} className="text-xs">
              Explore Menu
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Items ({items.length})</h3>
              {items.map((item, idx) => (
                <div key={idx} className="bg-card border border-border rounded-xl p-3 flex justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-semibold text-foreground">{item.name}</h4>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {item.modifiers.map((m) => `${m.groupName}: ${m.optionName}`).join(', ')}
                      </p>
                    )}
                    <p className="text-xs font-bold text-primary font-display">₹{item.unitPrice?.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-border rounded-lg bg-background">
                      <button onClick={() => updateQuantity(idx, item.quantity - 1)} className="p-1 text-muted-foreground">
                        <Minus size={12} />
                      </button>
                      <span className="px-2 text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, item.quantity + 1)} className="p-1 text-muted-foreground">
                        <Plus size={12} />
                      </button>
                    </div>

                    <button onClick={() => removeItem(idx)} className="text-rose-500 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupons & Loyalty Teaser */}
            <CouponSelector />
            <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-purple-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-3 text-xs">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 shrink-0">
                <Gift size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground">Earn Loyalty Rewards</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Sign in at checkout to start earning loyalty points on this order and redeem rewards.
                </p>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="bg-card border border-border rounded-xl p-3.5 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block">Special Kitchen Notes</label>
              <input
                type="text"
                placeholder="e.g. Less spicy, extra sauce..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-1.5 text-xs bg-background"
              />
            </div>

            {/* Bill Summary */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-xs">
              <h4 className="font-semibold text-foreground border-b border-border pb-2">Bill Summary</h4>
              <div className="flex justify-between text-muted-foreground"><span>Item Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span>₹{tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Service Charge (5%)</span><span>₹{serviceCharge.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-emerald-600 font-semibold"><span>Discounts</span><span>-₹{discount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2 font-display">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={() => navigate('/menu/checkout')} className="w-full gap-2 text-sm">
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </Button>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
