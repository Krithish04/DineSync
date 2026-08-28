import { useState, useMemo } from 'react';
import { X, Minus, Plus, ShoppingBag, Sparkles, AlertCircle, CheckCircle2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';

/**
 * ItemModifierSheet Component.
 * Mobile bottom sheet / modal for dish customization, required & optional modifier selection,
 * price calculations, quantity stepper, and "Add to Order" action.
 */
export default function ItemModifierSheet({ item, isOpen, onClose }) {
  const addItem = useCartStore((state) => state.addItem);
  const isViewOnly = useCartStore((state) => state.isViewOnly);

  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [validationError, setValidationError] = useState('');

  // Extract modifier groups from item
  const modifierGroups = useMemo(() => item?.modifierGroups || [], [item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 0;

  // Calculate modifier addon price
  const modifierTotal = Object.values(selectedModifiers)
    .flat()
    .reduce((sum, mod) => sum + (mod.price || 0), 0);

  const unitPrice = basePrice + modifierTotal;
  const totalPrice = unitPrice * quantity;

  // Handle single / multi-select modifier toggle
  const handleToggleModifier = (group, modifier) => {
    setValidationError('');
    const { groupName, maxSelect = 1 } = group;

    setSelectedModifiers((prev) => {
      const currentList = prev[groupName] || [];

      if (maxSelect === 1) {
        // Single select group
        const isSelected = currentList.some((m) => m.name === modifier.name);
        return {
          ...prev,
          [groupName]: isSelected ? [] : [modifier],
        };
      }

      // Multi-select group
      const isSelected = currentList.some((m) => m.name === modifier.name);
      let updatedList;
      if (isSelected) {
        updatedList = currentList.filter((m) => m.name !== modifier.name);
      } else {
        if (currentList.length >= maxSelect) {
          return prev; // Reached max
        }
        updatedList = [...currentList, modifier];
      }
      return {
        ...prev,
        [groupName]: updatedList,
      };
    });
  };

  const handleAddToCart = () => {
    // Validate required modifier groups
    for (const group of modifierGroups) {
      if (group.required) {
        const selected = selectedModifiers[group.groupName] || [];
        const min = group.minSelect || 1;
        if (selected.length < min) {
          setValidationError(`Please select at least ${min} option from "${group.groupName}".`);
          return;
        }
      }
    }

    // Flatten all selected modifiers for cart store item payload
    const flattenedModifiers = Object.values(selectedModifiers).flat();

    addItem(item, quantity, flattenedModifiers, specialInstructions);

    // Reset local state & close
    setQuantity(1);
    setSelectedModifiers({});
    setSpecialInstructions('');
    setValidationError('');
    onClose();
  };

  const isVeg = item.dietaryType === 'Veg';
  const isNonVeg = item.dietaryType === 'Non Veg' || item.dietaryType === 'Non-Veg';

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Top Swipe Drag-Handle for Mobile Bottom Sheet */}
        <div className="w-full flex items-center justify-center pt-2 pb-1 bg-card sm:hidden shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Full-Bleed Cover Image / Header */}
        <div className="relative w-full h-36 sm:h-52 bg-muted shrink-0 overflow-hidden">
          {item.imageCover ? (
            <img
              src={item.imageCover}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-muted to-accent/20 flex items-center justify-center">
              <Sparkles size={40} className="text-primary/40" />
            </div>
          )}

          {/* Top Gradient Overlay & 44px Tappable Close Button */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-black/40" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modifier sheet"
            className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center backdrop-blur-md transition-colors active:scale-95 touch-manipulation"
          >
            <X size={20} />
          </button>

          {/* Dietary & Spice Badge Overlays */}
          <div className="absolute bottom-2.5 left-3.5 flex items-center gap-2">
            {isVeg && (
              <span className="bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-white" /> Veg
              </span>
            )}
            {isNonVeg && (
              <span className="bg-rose-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-white" /> Non-Veg
              </span>
            )}
            {item.spiceLevel && (
              <span className="bg-amber-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                <Flame size={12} /> {item.spiceLevel}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Dish Header Info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-bold font-display text-foreground leading-snug">{item.name}</h2>
              <span className="text-base sm:text-lg font-bold text-primary font-display shrink-0">
                ₹{basePrice.toLocaleString('en-IN')}
              </span>
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
            )}
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
              <AlertCircle size={16} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Modifier Groups List */}
          {modifierGroups.length > 0 && (
            <div className="space-y-4 pt-1 border-t border-border">
              {modifierGroups.map((group, idx) => {
                const selected = selectedModifiers[group.groupName] || [];
                const isRequired = group.required;

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <span>{group.groupName}</span>
                        {isRequired ? (
                          <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                            Optional
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {group.maxSelect === 1 ? 'Select 1' : `Up to ${group.maxSelect}`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(group.modifiers || []).map((mod, mIdx) => {
                        const isChecked = selected.some((m) => m.name === mod.name);

                        return (
                          <div
                            key={mIdx}
                            onClick={() => handleToggleModifier(group, mod)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer touch-manipulation min-h-[48px] ${
                              isChecked
                                ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-xs'
                                : 'bg-card border-border hover:bg-muted/50 text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                  isChecked
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/40'
                                }`}
                              >
                                {isChecked && <CheckCircle2 size={12} />}
                              </div>
                              <span className="text-xs font-medium">{mod.name}</span>
                            </div>

                            {mod.price > 0 && (
                              <span className="text-xs font-bold text-primary font-display">
                                +₹{mod.price}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cooking & Special Instructions Input */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-muted-foreground">
              Cooking / Special Instructions (Optional)
            </label>
            <textarea
              placeholder="E.g. Extra spicy, no onions, sauce on the side..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full border border-border rounded-xl p-3 text-xs bg-background resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Sticky Action Footer with Safe-Area Clearance */}
        <div className="p-3.5 sm:p-4 bg-card border-t border-border flex items-center justify-between gap-3 shadow-lg shrink-0 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
          {/* Quantity Stepper (44px touch targets) */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border min-h-[44px]">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-card text-foreground font-bold flex items-center justify-center hover:bg-background disabled:opacity-40 transition-colors touch-manipulation active:scale-95"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-5 text-center font-bold text-sm font-display">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((prev) => prev + 1)}
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-card text-foreground font-bold flex items-center justify-center hover:bg-background transition-colors touch-manipulation active:scale-95"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add to Order CTA Button */}
          <Button
            onClick={handleAddToCart}
            disabled={isViewOnly}
            className="flex-1 h-12 min-h-[44px] rounded-2xl text-xs font-bold gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] touch-manipulation"
          >
            <ShoppingBag size={16} />
            <span>Add to Order</span>
            <span className="ml-auto font-display text-sm font-bold">₹{totalPrice.toLocaleString('en-IN')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
