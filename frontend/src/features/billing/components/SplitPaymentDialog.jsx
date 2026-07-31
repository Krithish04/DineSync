import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SplitPaymentDialog({
  invoice,
  onClose,
  onSubmit,
  isSaving = false,
}) {
  const [splits, setSplits] = useState([
    { paymentMethod: 'Cash', amount: Math.round(invoice.grandTotal / 2), transactionReference: '' },
    { paymentMethod: 'UPI', amount: invoice.grandTotal - Math.round(invoice.grandTotal / 2), transactionReference: '' },
  ]);
  const [error, setError] = useState('');

  const handleAddSplit = () => {
    const sum = calculateSum();
    const remaining = Math.max(0, invoice.grandTotal - sum);
    setSplits((prev) => [...prev, { paymentMethod: 'Card', amount: remaining, transactionReference: '' }]);
  };

  const handleRemoveSplit = (idx) => {
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx, field, value) => {
    setSplits((prev) => {
      const copy = [...prev];
      copy[idx][field] = field === 'amount' ? parseFloat(value) || 0 : value;
      return copy;
    });
  };

  const calculateSum = () => {
    return splits.reduce((sum, sp) => sum + sp.amount, 0);
  };

  const totalSplitSum = calculateSum();
  const balanceDue = invoice.grandTotal - totalSplitSum;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (splits.length < 2) {
      return setError('At least 2 payment splits are required.');
    }

    for (const [idx, sp] of splits.entries()) {
      if (sp.amount <= 0) {
        return setError(`Split amount at row ${idx + 1} must be positive.`);
      }
    }

    if (Math.abs(balanceDue) > 1.0) {
      return setError(`Split total (₹${totalSplitSum}) does not match due amount (₹${invoice.grandTotal}). Balance: ₹${balanceDue.toFixed(2)}.`);
    }

    onSubmit({
      invoiceId: invoice._id,
      paymentMethod: 'Split Payment',
      amount: invoice.grandTotal,
      splitPayments: splits,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
          <h4 className="font-bold text-sm text-foreground">Split Payment: {invoice.invoiceNumber}</h4>
          <span className="font-bold font-mono text-xs text-primary">₹{invoice.grandTotal} Invoice Total</span>
        </div>

        <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Splits list table */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {splits.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={row.paymentMethod}
                  onChange={(e) => handleRowChange(idx, 'paymentMethod', e.target.value)}
                  className="flex-1 h-9 px-2 text-xs border border-input rounded bg-background"
                  required
                >
                  {['Cash', 'Card', 'UPI', 'Net Banking', 'Wallet'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => handleRowChange(idx, 'amount', e.target.value)}
                  className="w-24 h-9 text-center font-mono text-xs"
                  required
                />

                <Input
                  placeholder="Ref # (optional)"
                  value={row.transactionReference}
                  onChange={(e) => handleRowChange(idx, 'transactionReference', e.target.value)}
                  className="w-32 h-9 text-xs"
                />

                {splits.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => handleRemoveSplit(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={handleAddSplit} className="text-xs gap-1">
            <Plus className="h-4 w-4" /> Add Split Line
          </Button>

          {/* Sum details */}
          <div className="border-t border-border pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between font-mono">
              <span>Split Total:</span>
              <span className="font-bold">₹{totalSplitSum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Balance:</span>
              <span className={`font-bold ${balanceDue === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {balanceDue === 0 ? 'Fully Paid' : balanceDue > 0 ? `₹${balanceDue.toFixed(2)} Due` : `₹${Math.abs(balanceDue).toFixed(2)} Surplus`}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" type="submit" isLoading={isSaving} className="text-xs">
              Record Split Payments
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
export { Plus };
