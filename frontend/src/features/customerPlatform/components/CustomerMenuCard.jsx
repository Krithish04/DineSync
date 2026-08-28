import { useState, memo } from 'react';
import { Plus, Minus, Sparkles, Flame, ChevronRight, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import ItemModifierSheet from './ItemModifierSheet';

const CustomerMenuCard = memo(function CustomerMenuCard({ item }) {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const items = useCartStore((s) => s.items);
  const isViewOnly = useCartStore((s) => s.isViewOnly);

  const cartItemsForItem = items.filter((i) => i.menuItemId === item._id);
  const cartQuantity = cartItemsForItem.reduce((sum, i) => sum + i.quantity, 0);
  const firstCartIndex = items.findIndex((i) => i.menuItemId === item._id);

  const [isModifierSheetOpen, setIsModifierSheetOpen] = useState(false);

  const isInactiveTable = useCartStore((s) => s.isInactiveTable || s.tableStatus === 'Inactive');
  const tableHost = useCartStore((s) => s.tableHost);
  const isVerifiedHost = Boolean(tableHost && tableHost.phone);
  const canAdd = !isViewOnly && !isInactiveTable;

  const hasModifiers = Boolean(
    (item.modifierGroups && item.modifierGroups.length > 0) ||
    (item.modifiers && item.modifiers.length > 0)
  );

  const handleCardClick = () => {
    if (hasModifiers) {
      setIsModifierSheetOpen(true);
    }
  };

  const checkAuthGate = () => {
    if (!isVerifiedHost) {
      document.dispatchEvent(new CustomEvent('open-customer-auth', { detail: { pendingItem: item } }));
      return false;
    }
    return true;
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (!canAdd) return;
    if (!checkAuthGate()) return;

    if (hasModifiers) {
      setIsModifierSheetOpen(true);
    } else {
      addItem(item, 1, [], '');
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!canAdd) return;
    if (!checkAuthGate()) return;

    if (hasModifiers) {
      setIsModifierSheetOpen(true);
    } else if (firstCartIndex > -1) {
      updateQuantity(firstCartIndex, items[firstCartIndex].quantity + 1);
    } else {
      addItem(item, 1, [], '');
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (!canAdd || firstCartIndex === -1) return;
    updateQuantity(firstCartIndex, items[firstCartIndex].quantity - 1);
  };

  const isVeg = item.dietaryType === 'Veg';
  const isNonVeg = item.dietaryType === 'Non Veg' || item.dietaryType === 'Non-Veg';

  return (
    <div
      onClick={handleCardClick}
      className={`bg-card border border-border/80 rounded-2xl p-3 sm:p-3.5 flex gap-2.5 sm:gap-3.5 hover:border-primary/50 transition-all shadow-xs overflow-hidden max-w-full ${
        hasModifiers ? 'cursor-pointer' : ''
      }`}
    >
      {/* Cover Image with Dietary Badge */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-muted">
        {item.imageCover ? (
          <img
            src={item.imageCover}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 bg-muted/50 p-2">
            <Utensils size={24} className="opacity-40" />
          </div>
        )}

        {/* Dietary Veg/NonVeg Indicator Tag */}
        <div className="absolute top-1.5 left-1.5 z-10">
          {isVeg && (
            <span className="w-4 h-4 rounded-sm bg-white border border-emerald-600 flex items-center justify-center shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
            </span>
          )}
          {isNonVeg && (
            <span className="w-4 h-4 rounded-sm bg-white border border-rose-600 flex items-center justify-center shadow-xs">
              <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-rose-600" />
            </span>
          )}
        </div>

        {(item.isPopular || item.isRecommended || item.aiRecommended) && (
          <span className="absolute bottom-1.5 left-1.5 bg-amber-500/95 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs backdrop-blur-xs">
            <Sparkles size={9} className="text-slate-950" /> AI pick
          </span>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0 overflow-hidden">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-sm sm:text-[15px] font-medium font-display text-foreground leading-snug truncate">
              {item.name}
            </h4>
          </div>

          <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Price & Quantity Actions */}
        <div className="flex items-center justify-between pt-1.5 gap-1.5 min-w-0">
          <div className="min-w-0 shrink">
            <p className="text-sm sm:text-[15px] font-semibold text-primary font-display truncate">
              ₹{Number(item.price || 0).toLocaleString('en-IN')}
            </p>
            {hasModifiers && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                Customizable <ChevronRight size={10} />
              </span>
            )}
          </div>

          {canAdd && (
            cartQuantity > 0 ? (
              <div className="flex items-center border border-primary/40 rounded-xl bg-primary/10 p-0.5 overflow-hidden shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-primary font-bold hover:bg-primary/20 transition-colors rounded-lg active:scale-95 touch-manipulation min-w-[32px] min-h-[32px]"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="px-1.5 min-w-[18px] text-center text-xs font-bold font-mono text-foreground">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-primary font-bold hover:bg-primary/20 transition-colors rounded-lg active:scale-95 touch-manipulation min-w-[32px] min-h-[32px]"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleAddClick}
                className="h-9 sm:h-10 min-h-[36px] sm:min-h-[40px] text-xs font-bold gap-1 px-3 sm:px-4 rounded-xl shadow-xs active:scale-95 touch-manipulation shrink-0"
              >
                <Plus size={14} /> Add
              </Button>
            )
          )}
        </div>
      </div>

      {/* Item Customization Bottom Sheet */}
      <ItemModifierSheet
        item={item}
        isOpen={isModifierSheetOpen}
        onClose={() => setIsModifierSheetOpen(false)}
      />
    </div>
  );
});

export default CustomerMenuCard;
