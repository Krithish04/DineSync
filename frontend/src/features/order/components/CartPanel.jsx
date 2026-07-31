import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import * as tableApi from '@/features/table/api/table.api';

export default function CartPanel({
  restaurantId,
  cartItems = [], // Array of { menuItemId, name, price, gst, quantity, modifiers: [{ groupName, optionName, price }], specialInstructions }
  onUpdateQty,
  onRemoveItem,
  branches = [],
  onSubmit,
  isPlacing = false,
}) {
  const [orderType, setOrderType] = useState('Dine-In');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [notes, setNotes] = useState('');
  
  const [tables, setTables] = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [error, setError] = useState('');

  // Preselect branch initially if available
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]._id);
    }
  }, [branches, selectedBranch]);

  // Load tables for selected branch
  const loadBranchTables = useCallback(async (branchId) => {
    if (!branchId) {
      setTables([]);
      return;
    }
    setIsLoadingTables(true);
    try {
      const res = await tableApi.listTables(restaurantId, { branch: branchId, limit: 100, status: 'Available' });
      setTables(res.items || []);
    } catch {
      setTables([]);
    } finally {
      setIsLoadingTables(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (selectedBranch) {
      loadBranchTables(selectedBranch);
    }
  }, [selectedBranch, loadBranchTables]);

  // Compute live cart totals
  const billing = useMemo(() => {
    let subtotal = 0;
    let tax = 0;

    cartItems.forEach((item) => {
      const basePrice = item.price;
      const modsCost = item.modifiers.reduce((sum, m) => sum + m.price, 0);
      const totalUnitCost = basePrice + modsCost;
      const itemSubtotal = totalUnitCost * item.quantity;
      const itemTax = (itemSubtotal * (item.gst || 0)) / 100;

      subtotal += itemSubtotal;
      tax += itemTax;
    });

    const discountVal = parseFloat(discountInput) || 0;
    const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100; // 5% Service Charge
    const grandTotal = Math.max(0, Math.round((subtotal - discountVal + tax + serviceCharge) * 100) / 100);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      serviceCharge,
      grandTotal,
      discount: discountVal,
    };
  }, [cartItems, discountInput]);

  const handleCheckout = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedBranch) return setError('Please select a branch.');
    if (['Dine-In', 'QR Order'].includes(orderType) && !selectedTable) {
      return setError('Please select a seating table.');
    }
    if (cartItems.length === 0) return setError('Your cart is empty.');

    const payload = {
      branch: selectedBranch,
      table: ['Dine-In', 'QR Order'].includes(orderType) ? selectedTable : null,
      orderType,
      items: cartItems.map((item) => ({
        menuItem: item.menuItemId,
        quantity: item.quantity,
        modifiers: item.modifiers,
        specialInstructions: item.specialInstructions || '',
      })),
      discount: billing.discount,
      notes,
    };

    onSubmit(payload);
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary animate-pulse" />
        <span className="font-bold text-sm text-foreground">Current Cart ({cartItems.length})</span>
      </div>

      {/* Cart Scrollable Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
        {error && (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
            <ShoppingCart className="h-8 w-8 opacity-20 mb-2" />
            <p className="text-xs font-semibold">Your basket is empty</p>
            <p className="text-[10px] opacity-75 mt-0.5">Click menu items on the left to add.</p>
          </div>
        ) : (
          cartItems.map((item, idx) => {
            const modsCost = item.modifiers.reduce((sum, m) => sum + m.price, 0);
            const totalUnitCost = item.price + modsCost;
            return (
              <div key={idx} className="flex gap-2.5 items-start justify-between border-b border-border/40 pb-3 last:border-none last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                  {/* Modifiers names list */}
                  {item.modifiers.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Mods: {item.modifiers.map((m) => `${m.optionName} (+₹${m.price})`).join(', ')}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="text-[9px] text-amber-700 italic mt-0.5">
                      *{item.specialInstructions}
                    </p>
                  )}
                  <p className="text-xs text-foreground font-semibold mt-1">
                    ₹{totalUnitCost.toFixed(2)}
                  </p>
                </div>

                {/* Qty edit controls */}
                <div className="flex items-center gap-1.5 bg-muted/40 rounded border border-border px-1 h-7 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(idx, item.quantity - 1)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-0.5"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(idx, item.quantity + 1)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-0.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(idx)}
                    className="text-muted-foreground hover:text-destructive border-l border-border/80 pl-1 ml-0.5"
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart settings & Calculations */}
      <div className="border-t border-border p-4 bg-muted/10 space-y-4">
        {/* Branch, type selectors */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Location</Label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full h-8 px-2 border border-input rounded bg-background"
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Order Type</Label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full h-8 px-2 border border-input rounded bg-background"
            >
              <option value="Dine-In">Dine-In</option>
              <option value="Takeaway">Takeaway</option>
              <option value="Delivery">Delivery</option>
              <option value="QR Order">QR Order</option>
            </select>
          </div>

          {['Dine-In', 'QR Order'].includes(orderType) && (
            <div className="space-y-1 col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Seating Table *</Label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                disabled={isLoadingTables}
                className="w-full h-8 px-2 border border-input rounded bg-background"
              >
                <option value="">Select table...</option>
                {tables.map((t) => (
                  <option key={t._id} value={t._id}>
                    Table {t.tableNumber} (Cap: {t.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Discount & notes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Discount (₹)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0.00"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          <div>
            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Order Notes</Label>
            <Input
              placeholder="Allergies..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Totals panel */}
        <div className="space-y-1 text-xs border-t border-border/40 pt-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">₹{billing.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST Tax</span>
            <span className="font-mono">₹{billing.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service Charge (5%)</span>
            <span className="font-mono">₹{billing.serviceCharge.toFixed(2)}</span>
          </div>
          {billing.discount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Discount</span>
              <span className="font-mono">-₹{billing.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t border-dashed border-border/60">
            <span>Grand Total</span>
            <span className="font-mono text-primary">₹{billing.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          onClick={handleCheckout}
          isLoading={isPlacing}
          className="w-full text-xs font-bold gap-1.5 mt-2"
          disabled={cartItems.length === 0}
        >
          <CreditCard className="h-4 w-4" /> Place Order
        </Button>
      </div>
    </div>
  );
}

// Add simple useMemo import since we used it in totals calculation
import { useMemo } from 'react';
