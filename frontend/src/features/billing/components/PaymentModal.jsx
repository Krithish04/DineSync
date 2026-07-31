import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PaymentModal({
  invoice,
  onClose,
  onSubmit,
  onToggleSplit, // Callback to switch to SplitPaymentDialog
  isSaving = false,
}) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountInput, setAmountInput] = useState(() => invoice.grandTotal.toString());
  const [txRef, setTxRef] = useState('');
  const [error, setError] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      return setError('Please enter a positive payment amount.');
    }

    if (Math.abs(amt - invoice.grandTotal) > 0.1) {
      return setError(`Payment amount (₹${amt}) must match invoice total (₹${invoice.grandTotal}).`);
    }

    onSubmit({
      invoiceId: invoice._id,
      paymentMethod,
      amount: amt,
      transactionReference: txRef.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
          <h4 className="font-bold text-sm text-foreground">Record Payment: {invoice.invoiceNumber}</h4>
          <span className="font-bold font-mono text-xs text-primary">₹{invoice.grandTotal} Due</span>
        </div>

        <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Payment Method selectors */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Select Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'Card', 'UPI'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 border rounded text-xs font-semibold text-center transition-all ${
                    paymentMethod === method
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount collected (₹) *</Label>
              <Input
                id="pay-amount"
                type="number"
                min="0.01"
                step="any"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Transaction Ref</Label>
              <Input
                id="pay-ref"
                placeholder="e.g. UPI/Card txn ID"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button size="sm" type="submit" isLoading={isSaving} className="w-full text-xs">
              Complete Payment (₹{invoice.grandTotal})
            </Button>
            {onToggleSplit && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={onToggleSplit}
                className="w-full text-xs border-primary/20 text-primary hover:bg-primary/5"
              >
                Switch to Split Payment
              </Button>
            )}
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="w-full text-xs">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
