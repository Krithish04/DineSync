import { useState } from 'react';
import { FileText, Users, Scissors, GitPullRequest, Divide, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function BillSummary({
  order,
  onSplit,
  isProcessingSplit = false,
}) {
  const [splitMode, setSplitMode] = useState('none'); // 'none', 'equal', 'items'
  
  // Equal Split state
  const [guestCount, setGuestCount] = useState(2);
  
  // Item split state
  const [selectedItems, setSelectedItems] = useState({}); // { [itemId]: quantity }
  const [splitError, setSplitError] = useState('');

  const handleEqualSplitSubmit = () => {
    if (guestCount < 2) return;
    onSplit({
      splitType: 'equal',
      splitCount: guestCount,
    });
  };

  const handleItemCheckboxChange = (itemId, maxQty) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[itemId]) {
        delete copy[itemId];
      } else {
        copy[itemId] = 1;
      }
      return copy;
    });
  };

  const handleQtyChange = (itemId, qty, maxQty) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: Math.max(1, Math.min(maxQty, qty)),
    }));
  };

  const handleItemSplitSubmit = () => {
    setSplitError('');
    const itemsToSplit = Object.entries(selectedItems).map(([itemId, quantity]) => ({
      itemId,
      quantity,
    }));

    if (itemsToSplit.length === 0) {
      return setSplitError('Please select at least 1 item to split off.');
    }

    // Check if the split leaves no items in the original order
    const allItemsSplitFullQty = order.items.every((item) => {
      const splitQty = selectedItems[item._id];
      return splitQty && splitQty === item.quantity;
    });

    if (allItemsSplitFullQty) {
      return setSplitError('Cannot split all items off. At least one item must remain on the original order.');
    }

    onSplit({
      splitType: 'items',
      splitItems: itemsToSplit,
    });
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <FileText className="h-4.5 w-4.5 text-primary" />
          <h4 className="font-bold text-sm text-foreground">Billing Invoice</h4>
        </div>

        {/* Invoice Items list */}
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground truncate max-w-[190px]">
                {item.itemName} x{item.quantity}
              </span>
              <span className="font-mono">
                ₹{((item.unitPrice + item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Invoice breakdown counts */}
        <div className="space-y-1.5 text-xs border-t border-border/40 pt-4">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST Tax</span>
            <span className="font-mono">₹{order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service Charge (5%)</span>
            <span className="font-mono">₹{order.serviceCharge.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Discount</span>
              <span className="font-mono">-₹{order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm text-foreground pt-2 border-t border-dashed border-border/60">
            <span>Grand Total</span>
            <span className="font-mono text-primary">₹{order.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Bill Splitting Toggles */}
        {order.paymentStatus === 'Pending' && order.orderStatus !== 'Cancelled' && (
          <div className="border-t border-border/40 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-foreground">Split Bill Options</Label>
              {splitMode !== 'none' && (
                <button
                  onClick={() => {
                    setSplitMode('none');
                    setSelectedItems({});
                    setSplitError('');
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Cancel split
                </button>
              )}
            </div>

            {splitMode === 'none' && (
              <div className="grid grid-cols-2 gap-3.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-8.5 font-semibold gap-1"
                  onClick={() => setSplitMode('equal')}
                >
                  <Divide className="h-3.5 w-3.5" /> Equal Split
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-8.5 font-semibold gap-1"
                  onClick={() => setSplitMode('items')}
                >
                  <Scissors className="h-3.5 w-3.5" /> Item Split
                </Button>
              </div>
            )}

            {/* Equal Split Input */}
            {splitMode === 'equal' && (
              <div className="space-y-3 bg-muted/30 border rounded p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="equal-split-guests">Number of guests:</Label>
                  <Input
                    id="equal-split-guests"
                    type="number"
                    min="2"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 2)}
                    className="w-16 h-8 text-center font-mono text-xs"
                  />
                </div>
                <div className="flex justify-between font-bold border-t border-border/60 pt-2 text-primary">
                  <span>Per Head Split</span>
                  <span className="font-mono">₹{(order.grandTotal / guestCount).toFixed(2)}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full text-[11px] h-8.5"
                  onClick={handleEqualSplitSubmit}
                  isLoading={isProcessingSplit}
                >
                  Confirm split info
                </Button>
              </div>
            )}

            {/* Item Split Panel */}
            {splitMode === 'items' && (
              <div className="space-y-3 bg-muted/30 border rounded p-3 text-xs">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Select items to split off:</p>
                {splitError && <p className="text-[10px] text-destructive font-medium">{splitError}</p>}
                
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                  {order.items.map((item) => {
                    const isChecked = !!selectedItems[item._id];
                    return (
                      <div key={item._id} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-none last:pb-0">
                        <label className="flex items-center gap-2 cursor-pointer truncate max-w-[160px]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleItemCheckboxChange(item._id, item.quantity)}
                            className="rounded text-primary focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{item.itemName}</span>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground">Qty:</span>
                            <Input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={selectedItems[item._id] || 1}
                              onChange={(e) => handleQtyChange(item._id, parseInt(e.target.value, 10) || 1, item.quantity)}
                              className="w-12 h-6 text-center font-mono text-[10px] p-0"
                            />
                            <span className="text-[10px] text-muted-foreground">/ {item.quantity}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  className="w-full text-[11px] h-8.5 mt-2"
                  onClick={handleItemSplitSubmit}
                  isLoading={isProcessingSplit}
                >
                  Split into separate order
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
