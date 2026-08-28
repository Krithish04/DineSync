import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import useCartStore from '../store/cart.store';

/**
 * Sticky Bottom Cart Bar (Swiggy / Zomato style).
 * Fixed at the bottom of the viewport when cart is non-empty.
 * Hidden when diner is already on the Cart or Checkout pages.
 */
export default function StickyCartBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    items = [],
    getItemCount,
    getGrandTotal,
    isViewOnly,
    isInactiveTable,
  } = useCartStore();

  const itemCount = getItemCount();
  const grandTotal = getGrandTotal();

  const isCartOrCheckoutPage =
    location.pathname.startsWith('/menu/cart') ||
    location.pathname.startsWith('/menu/checkout');

  // Hide if cart is empty, in view-only / inactive mode, or already viewing Cart/Checkout pages
  if (items.length === 0 || isViewOnly || isInactiveTable || isCartOrCheckoutPage) {
    return null;
  }

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-0 right-0 z-40 px-3 sm:px-4 max-w-2xl mx-auto pointer-events-none animate-in slide-in-from-bottom-4 duration-200 pb-[env(safe-area-inset-bottom)]">
      <div
        onClick={() => navigate('/menu/cart')}
        className="pointer-events-auto bg-primary text-primary-foreground rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-primary/95 transition-all active:scale-[0.99] touch-manipulation min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <ShoppingBag size={20} className="text-primary-foreground" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-primary-foreground/90 uppercase tracking-wider">
              {itemCount} {itemCount === 1 ? 'Item' : 'Items'} Added
            </p>
            <p className="text-base sm:text-lg font-bold font-display leading-tight">
              ₹{Number(grandTotal || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm bg-white/20 px-3.5 py-2.5 rounded-xl text-primary-foreground hover:bg-white/30 transition-colors shadow-xs min-h-[44px]">
          <span>View Cart</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  );
}
