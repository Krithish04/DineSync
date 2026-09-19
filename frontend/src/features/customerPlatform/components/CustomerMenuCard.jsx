import { useState, memo } from 'react';
import { Plus, Minus, Sparkles, Flame, ChevronRight, Utensils, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import ItemModifierSheet from './ItemModifierSheet';

const CustomerMenuCard = memo(function CustomerMenuCard({ item, isClosed: propIsClosed }) {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const items = useCartStore((s) => s.items);
  const isViewOnly = useCartStore((s) => s.isViewOnly);
  const operatingStatus = useCartStore((s) => s.operatingStatus);

  const isClosed = Boolean(propIsClosed || operatingStatus?.isClosed);

  const cartItemsForItem = items.filter((i) => i.menuItemId === item._id);
  const cartQuantity = cartItemsForItem.reduce((sum, i) => sum + i.quantity, 0);
  const firstCartIndex = items.findIndex((i) => i.menuItemId === item._id);

  const [isModifierSheetOpen, setIsModifierSheetOpen] = useState(false);

  const isInactiveTable = useCartStore((s) => s.isInactiveTable || s.tableStatus === 'Inactive');
  const tableHost = useCartStore((s) => s.tableHost);
  const isVerifiedHost = Boolean(tableHost && tableHost.phone);
  const canAdd = !isViewOnly && !isInactiveTable && !isClosed;

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
      className={`bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 flex gap-2.5 sm:gap-3 hover:border-primary/60 transition-all shadow-xs overflow-hidden max-w-full ${
        hasModifiers ? 'cursor-pointer' : ''
      }`}
    >
      {/* Cover Image with High Contrast Dietary Badge */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
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
            <Utensils size={22} className="opacity-40" />
          </div>
        )}

        {/* Dietary Veg/NonVeg Text Badge for Senior High Readability */}
        <div className="absolute top-1 left-1 z-10">
          {isVeg && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> VEG
            </span>
          )}
          {isNonVeg && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white shadow-xs flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> NON-VEG
            </span>
          )}
        </div>

        {(item.isRecommended || item.isChefSpecial) ? (
          <span className="absolute bottom-1 left-1 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
            <Sparkles size={9} /> Special
          </span>
        ) : (item.isPopular || item.aiRecommended) ? (
          <span className="absolute bottom-1 left-1 bg-amber-500/95 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
            <Sparkles size={9} /> Popular
          </span>
        ) : null}
      </div>

      {/* Item Details — Senior Friendly Readability */}
      <div className="flex-1 flex flex-col justify-between min-w-0 overflow-hidden py-0.5">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-base sm:text-lg font-bold font-display text-foreground leading-snug tracking-tight truncate">
              {item.name}
            </h4>
          </div>

          <p className="text-xs sm:text-sm text-foreground/85 font-medium mt-0.5 line-clamp-2 leading-snug">
            {item.description}
          </p>
        </div>

        {/* Price & Touch-Friendly Senior Add Actions */}
        <div className="flex items-center justify-between pt-1 gap-2 min-w-0">
          <div className="min-w-0 shrink">
            <p className="text-base sm:text-lg font-extrabold text-primary font-display truncate">
              ₹{Number(item.price || 0).toLocaleString('en-IN')}
            </p>
            {hasModifiers && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 truncate">
                Customizable <ChevronRight size={10} />
              </span>
            )}
          </div>

          {isClosed ? (
            <span className="h-9 min-h-[36px] px-3 text-xs font-bold rounded-xl bg-muted text-muted-foreground border border-border flex items-center gap-1 shrink-0 cursor-not-allowed select-none opacity-80">
              <Clock size={14} /> Closed
            </span>
          ) : canAdd ? (
            cartQuantity > 0 ? (
              <div className="flex items-center border-2 border-primary rounded-xl bg-primary/10 p-0.5 overflow-hidden shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-primary font-extrabold hover:bg-primary/20 transition-colors rounded-lg active:scale-95 touch-manipulation min-w-[32px] min-h-[32px]"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="px-2 min-w-[20px] text-center text-sm font-extrabold text-foreground">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-primary font-extrabold hover:bg-primary/20 transition-colors rounded-lg active:scale-95 touch-manipulation min-w-[32px] min-h-[32px]"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleAddClick}
                className="h-9 min-h-[36px] text-xs sm:text-sm font-extrabold gap-1 px-3.5 sm:px-4 rounded-xl shadow-xs active:scale-95 touch-manipulation shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus size={16} /> ADD
              </Button>
            )
          ) : null}
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
