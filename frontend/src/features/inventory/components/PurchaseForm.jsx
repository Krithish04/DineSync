import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PurchaseForm({
  restaurantId,
  suppliers = [],
  ingredients = [],
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  
  const [items, setItems] = useState([
    { ingredient: '', quantity: 1, unitPrice: 0 },
  ]);
  const [error, setError] = useState('');

  // Pre-select supplier
  useEffect(() => {
    if (suppliers.length > 0 && !supplier) {
      setSupplier(suppliers[0]._id);
    }
  }, [suppliers, supplier]);

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, { ingredient: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveRow = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx][field] =
        field === 'ingredient'
          ? value
          : field === 'quantity'
          ? parseFloat(value) || 0
          : parseFloat(value) || 0;
      return copy;
    });
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!supplier) return setError('Supplier is required.');
    if (items.length === 0) return setError('Invoice must contain at least 1 item.');

    // Validate item rows
    for (const [idx, item] of items.entries()) {
      if (!item.ingredient) {
        return setError(`Please select an ingredient at row ${idx + 1}.`);
      }
      if (item.quantity <= 0) {
        return setError(`Quantity at row ${idx + 1} must be positive.`);
      }
      if (item.unitPrice < 0) {
        return setError(`Unit price at row ${idx + 1} cannot be negative.`);
      }
    }

    onSubmit({
      supplier,
      invoiceNumber,
      purchaseDate,
      paymentStatus,
      items,
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic metadata grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="supplier">Supplier Contact *</Label>
          <select
            id="supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
            required
          >
            <option value="" disabled>Select supplier...</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.supplierName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="e.g. INV-9872-A"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purchaseDate">Purchase Date *</Label>
          <Input
            id="purchaseDate"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <select
            id="paymentStatus"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Purchase items</p>
        
        <div className="overflow-x-auto border border-border/80 rounded-lg">
          <table className="w-full text-xs text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                <th className="p-3 font-medium flex-1">Ingredient Item</th>
                <th className="p-3 font-medium w-28 text-center">Quantity</th>
                <th className="p-3 font-medium w-28 text-center">Unit Price (₹)</th>
                <th className="p-3 font-medium w-28 text-right">Amount</th>
                <th className="p-3 font-medium w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx} className="border-b border-border/40 last:border-none">
                  <td className="p-2">
                    <select
                      value={row.ingredient}
                      onChange={(e) => handleRowChange(idx, 'ingredient', e.target.value)}
                      className="w-full h-9 px-2 border border-input rounded bg-background"
                      required
                    >
                      <option value="" disabled>Select ingredient...</option>
                      {ingredients.map((ing) => (
                        <option key={ing._id} value={ing._id}>
                          {ing.ingredientName} ({ing.unit})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0.0001"
                      step="any"
                      value={row.quantity}
                      onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                      className="h-9 text-center font-mono"
                      required
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitPrice}
                      onChange={(e) => handleRowChange(idx, 'unitPrice', e.target.value)}
                      className="h-9 text-center font-mono"
                      required
                    />
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-foreground">
                    ₹{(row.quantity * row.unitPrice).toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-muted"
                        onClick={() => handleRemoveRow(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="text-xs gap-1">
          <Plus className="h-4 w-4" /> Add Item Line
        </Button>
      </div>

      {/* Invoice summary & checkout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-border pt-4">
        <div className="text-sm font-bold text-foreground">
          Grand Total: <span className="font-mono text-primary text-base ml-1">₹{calculateGrandTotal().toFixed(2)}</span>
        </div>

        <div className="flex gap-3">
          <Button type="submit" isLoading={isSaving}>
            Submit Invoice
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
