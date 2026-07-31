import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, Tag, Gift, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();

  const {
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
    orderType,
  } = useCartStore();

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const tax = getTax();
  const serviceCharge = getServiceCharge();
  const discount = getDiscount();
  const grandTotal = getGrandTotal();

  const handleCheckout = () => {
    onClose();
    navigate('/menu/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-l border-border w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-primary" size={20} />
            <h3 className="text-base font-bold font-display text-foreground">Your Order Cart</h3>
            {tableNumber && (
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                Table #{tableNumber}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-8 w-8">
            <X size={18} />
          </Button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
              <ShoppingBag size={40} className="text-muted-foreground/40" />
              <p className="text-sm font-medium">Your cart is empty.</p>
              <p className="text-xs">Browse the menu and add your favorite dishes!</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="bg-muted/30 border border-border rounded-xl p-3 flex justify-between gap-2">
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
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2 text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}

          {items.length > 0 && (
            <div className="pt-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Kitchen Instructions</label>
              <textarea
                placeholder="e.g. Extra napkins, serve starters first..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full border border-border rounded-lg p-2 text-xs bg-background resize-none h-16"
              />
            </div>
          )}
        </div>

        {/* Bill Summary Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border bg-card space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Service Charge (5%)</span>
                <span>₹{serviceCharge.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discounts Applied</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-1 font-display">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={handleCheckout} className="w-full gap-2 text-sm">
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
