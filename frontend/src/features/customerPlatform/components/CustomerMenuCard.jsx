import { useState, memo } from 'react';
import { Plus, Minus, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import CustomerAuthModal from './CustomerAuthModal';

const CustomerMenuCard = memo(function CustomerMenuCard({ item }) {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const items = useCartStore((s) => s.items);
  const isViewOnly = useCartStore((s) => s.isViewOnly);

  const cartItemsForItem = items.filter((i) => i.menuItemId === item._id);
  const cartQuantity = cartItemsForItem.reduce((sum, i) => sum + i.quantity, 0);
  const firstCartIndex = items.findIndex((i) => i.menuItemId === item._id);

  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [showAuthPromptModal, setShowAuthPromptModal] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const dietaryColors = {
    Veg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Non Veg': 'bg-rose-100 text-rose-800 border-rose-300',
    Vegan: 'bg-teal-100 text-teal-800 border-teal-300',
    Jain: 'bg-amber-100 text-amber-800 border-amber-300',
  };

  const isInactiveTable = useCartStore((s) => s.isInactiveTable || s.tableStatus === 'Inactive');
  const canAdd = !isViewOnly && !isInactiveTable;

  const handleAddClick = () => {
    if (!canAdd) return;

    if (item.modifiers && item.modifiers.length > 0) {
      setShowModifiersModal(true);
    } else {
      addItem(item, 1, [], '');
    }
  };

  const handleIncrement = () => {
    if (!canAdd) return;

    if (item.modifiers && item.modifiers.length > 0) {
      setShowModifiersModal(true);
    } else if (firstCartIndex > -1) {
      updateQuantity(firstCartIndex, items[firstCartIndex].quantity + 1);
    } else {
      addItem(item, 1, [], '');
    }
  };

  const handleDecrement = () => {
    if (!canAdd || firstCartIndex === -1) return;
    updateQuantity(firstCartIndex, items[firstCartIndex].quantity - 1);
  };

  const handleConfirmModifiers = () => {
    addItem(item, 1, selectedModifiers, specialInstructions);
    setShowModifiersModal(false);
    setSelectedModifiers([]);
    setSpecialInstructions('');
  };

  const toggleModifier = (groupName, option) => {
    const exists = selectedModifiers.some((m) => m.groupName === groupName && m.optionName === option.name);
    if (exists) {
      setSelectedModifiers(selectedModifiers.filter((m) => !(m.groupName === groupName && m.optionName === option.name)));
    } else {
      setSelectedModifiers([...selectedModifiers, { groupName, optionName: option.name, price: option.price || 0 }]);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 flex gap-3 hover:border-primary/40 transition-colors">
      {/* Cover Image */}
      <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
        {item.imageCover ? (
          <img src={item.imageCover} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-primary/10 text-primary font-bold">
            DineSync
          </div>
        )}
        {item.isPopular && (
          <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
            <Sparkles size={8} /> Popular
          </span>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-sm sm:text-base font-semibold font-display text-foreground leading-tight">{item.name}</h4>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${dietaryColors[item.dietaryType] || 'bg-muted'}`}>
              {item.dietaryType}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        </div>

        <div className="flex items-center justify-between pt-2.5">
          <p className="text-sm sm:text-base font-bold text-primary font-display">₹{item.price?.toFixed(2)}</p>

          {canAdd && (
            cartQuantity > 0 ? (
              <div className="flex items-center border border-primary/40 rounded-xl bg-primary/5 p-0.5 overflow-hidden">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-9 h-9 flex items-center justify-center text-primary font-bold hover:bg-primary/10 transition-colors rounded-lg active:scale-95 touch-manipulation"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <span className="px-2.5 min-w-[24px] text-center text-xs font-bold font-mono text-foreground">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-9 h-9 flex items-center justify-center text-primary font-bold hover:bg-primary/10 transition-colors rounded-lg active:scale-95 touch-manipulation"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleAddClick}
                className="h-9 min-w-[80px] text-xs font-semibold gap-1 px-3.5 rounded-xl shadow-xs"
              >
                <Plus size={14} /> Add
              </Button>
            )
          )}
        </div>
      </div>

      {/* Modifiers Modal Overlay */}
      {showModifiersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <h3 className="text-base font-bold font-display text-foreground">Customize {item.name}</h3>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
              {(item.modifiers || []).map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{group.groupName}</p>
                  {(group.options || []).map((opt, oIdx) => {
                    const isSelected = selectedModifiers.some((m) => m.groupName === group.groupName && m.optionName === opt.name);
                    return (
                      <label
                        key={oIdx}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer min-h-[44px] transition-colors ${
                          isSelected ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-border text-foreground'
                        }`}
                        onClick={() => toggleModifier(group.groupName, opt)}
                      >
                        <span>{opt.name}</span>
                        <span className="font-mono">+{opt.price ? `₹${opt.price}` : 'Free'}</span>
                      </label>
                    );
                  })}
                </div>
              ))}

              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Special Instructions</label>
                <input
                  type="text"
                  placeholder="e.g., Less spicy, no onions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-base sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border shrink-0">
              <Button variant="outline" size="sm" className="h-10 text-xs px-4" onClick={() => setShowModifiersModal(false)}>Cancel</Button>
              <Button size="sm" className="h-10 text-xs px-4 font-bold" onClick={handleConfirmModifiers}>Add to Order</Button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Prompt Modal */}
      <CustomerAuthModal isOpen={showAuthPromptModal} onClose={() => setShowAuthPromptModal(false)} />
    </div>
  );
});

export default CustomerMenuCard;
