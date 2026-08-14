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
    <CustomerLayout title="Your Order Cart">
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            <ShoppingBag className="text-primary" size={22} />
            <span>Order Cart</span>
            {tableNumber && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Table #{tableNumber}
              </span>
            )}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/menu/browse')}
            className="text-xs font-semibold text-primary hover:underline h-9 px-2"
          >
            + Add More Items
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <ShoppingBag size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Your order cart is empty</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">Add delicious dishes from our menu to place an order.</p>
            </div>
            <Button size="lg" onClick={() => navigate('/menu/browse')} className="text-xs font-bold px-6 h-11 rounded-xl">
              Explore Menu
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Order Items ({items.length})
                </h3>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="bg-card border border-border rounded-2xl p-3.5 flex justify-between gap-3 shadow-xs items-center">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground leading-tight truncate">{item.name}</h4>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {item.modifiers.map((m) => `${m.groupName}: ${m.optionName}`).join(', ')}
                      </p>
                    )}
                    <p className="text-sm font-bold text-primary font-display">₹{item.unitPrice?.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg active:scale-95 touch-manipulation"
                        aria-label="Decrease item quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-2 min-w-[24px] text-center text-xs font-bold font-mono text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg active:scale-95 touch-manipulation"
                        aria-label="Increase item quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="w-9 h-9 flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors active:scale-95 touch-manipulation"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupons & Loyalty Teaser */}
            <CouponSelector />

            <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-purple-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 shrink-0">
                <Gift size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground text-xs sm:text-sm">Earn Loyalty Rewards</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Sign in at checkout to earn points on this order and unlock instant discounts.
                </p>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-1.5 shadow-xs">
              <label className="text-xs font-semibold text-muted-foreground block">Special Kitchen Notes</label>
              <input
                type="text"
                placeholder="e.g. Less spicy, extra sauce, no onions..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-base sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Bill Summary */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5 text-xs shadow-xs">
              <h4 className="font-bold text-foreground border-b border-border pb-2 text-xs sm:text-sm font-display">
                Bill Summary
              </h4>
              <div className="flex justify-between text-muted-foreground"><span>Item Subtotal</span><span className="font-mono">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span className="font-mono">₹{tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Service Charge (5%)</span><span className="font-mono">₹{serviceCharge.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-emerald-600 font-semibold"><span>Discounts</span><span className="font-mono">-₹{discount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-sm sm:text-base font-bold text-foreground border-t border-border pt-2.5 font-display">
                <span>Grand Total</span>
                <span className="text-primary font-mono">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/menu/checkout')}
              className="w-full h-12 text-sm sm:text-base font-bold gap-2 rounded-2xl shadow-lg active:scale-[0.99] touch-manipulation"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </Button>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
