import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StockAdjustmentModal({
  ingredient,
  onClose,
  onSubmit,
  isSaving = false,
}) {
  const [opType, setOpType] = useState('add'); // 'add' or 'subtract'
  const [quantityInput, setQuantityInput] = useState('');
  const [transactionType, setTransactionType] = useState('Adjustment'); // 'Adjustment' or 'Waste'
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      return setError('Please enter a positive quantity value.');
    }

    const delta = opType === 'add' ? qty : -qty;

    if (opType === 'subtract' && qty > ingredient.currentStock) {
      return setError(`Deduction exceeds current stock (${ingredient.currentStock} ${ingredient.unit}).`);
    }

    onSubmit({
      ingredient: ingredient._id,
      transactionType: opType === 'subtract' && transactionType === 'Waste' ? 'Waste' : 'Adjustment',
      quantity: delta,
      reason: reason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-border bg-muted/20">
          <h4 className="font-bold text-sm text-foreground">Adjust Stock: {ingredient.ingredientName}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Current balance: {ingredient.currentStock} {ingredient.unit}
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Operation radio selectors */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Operation Direction</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpType('add');
                  setTransactionType('Adjustment');
                }}
                className={`py-2 px-3 border rounded text-xs font-semibold text-center transition-all ${
                  opType === 'add'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted text-foreground'
                }`}
              >
                Add Stock (+)
              </button>
              <button
                type="button"
                onClick={() => setOpType('subtract')}
                className={`py-2 px-3 border rounded text-xs font-semibold text-center transition-all ${
                  opType === 'subtract'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted text-foreground'
                }`}
              >
                Deduct Stock (-)
              </button>
            </div>
          </div>

          {/* If subtract, toggle Waste/Adjustment */}
          {opType === 'subtract' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Deduction Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionType('Adjustment')}
                  className={`py-2 px-3 border rounded text-xs font-semibold text-center transition-all ${
                    transactionType === 'Adjustment'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  Correction / Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('Waste')}
                  className={`py-2 px-3 border rounded text-xs font-semibold text-center transition-all ${
                    transactionType === 'Waste'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  Spoilage / Waste
                </button>
              </div>
            </div>
          )}

          {/* Quantity entry */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-qty">Adjustment Amount ({ingredient.unit}) *</Label>
            <Input
              id="adj-qty"
              type="number"
              min="0.0001"
              step="any"
              placeholder="e.g. 5"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="font-mono text-xs"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Adjustment Reason *</Label>
            <Input
              id="adj-reason"
              placeholder="e.g. Broken packaging, recipe balance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border mt-4">
            <Button variant="outline" size="sm" type="button" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" type="submit" isLoading={isSaving} className="text-xs">
              Apply Adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
