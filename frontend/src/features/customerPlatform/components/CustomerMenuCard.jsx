import { useState, memo } from 'react';
import { Plus, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import CustomerAuthModal from './CustomerAuthModal';

const CustomerMenuCard = memo(function CustomerMenuCard({ item }) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const isViewOnly = useCartStore((s) => s.isViewOnly);
  const tableHost = useCartStore((s) => s.tableHost);

  const cartQuantity = items
    .filter((i) => i.menuItemId === item._id)
    .reduce((sum, i) => sum + i.quantity, 0);

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
            <h4 className="text-sm font-semibold font-display text-foreground leading-tight">{item.name}</h4>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${dietaryColors[item.dietaryType] || 'bg-muted'}`}>
              {item.dietaryType}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-bold text-primary font-display">₹{item.price?.toFixed(2)}</p>

          {canAdd && (
            <Button size="sm" onClick={handleAddClick} className="h-8 text-xs gap-1 px-3">
              <Plus size={14} /> Add {cartQuantity > 0 && `(${cartQuantity})`}
            </Button>
          )}
        </div>
      </div>

      {/* Modifiers Modal Overlay */}
      {showModifiersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold font-display">Customize {item.name}</h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {(item.modifiers || []).map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{group.groupName}</p>
                  {(group.options || []).map((opt, oIdx) => {
                    const isSelected = selectedModifiers.some((m) => m.groupName === group.groupName && m.optionName === opt.name);
                    return (
                      <label
                        key={oIdx}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${
                          isSelected ? 'border-primary bg-primary/10 font-semibold' : 'border-border'
                        }`}
                        onClick={() => toggleModifier(group.groupName, opt)}
                      >
                        <span>{opt.name}</span>
                        <span>+{opt.price ? `₹${opt.price}` : 'Free'}</span>
                      </label>
                    );
                  })}
                </div>
              ))}

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Special Instructions</label>
                <input
                  type="text"
                  placeholder="e.g., Less spicy, no onions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowModifiersModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmModifiers}>Add to Order</Button>
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
