import { useState } from 'react';
import { Tag, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';

const AVAILABLE_COUPONS = [
  { code: 'DINE10', label: '10% OFF on orders above ₹500', discountAmount: 50 },
  { code: 'WELCOME50', label: 'Flat ₹50 OFF for new diners', discountAmount: 50 },
  { code: 'FEAST100', label: 'Flat ₹100 OFF on orders above ₹1000', discountAmount: 100 },
];

export default function CouponSelector() {
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');

  const handleApply = (c) => {
    applyCoupon(c);
    setError('');
  };

  const handleManualApply = () => {
    const found = AVAILABLE_COUPONS.find((c) => c.code.toUpperCase() === inputCode.trim().toUpperCase());
    if (found) {
      applyCoupon(found);
      setInputCode('');
      setError('');
    } else {
      setError('Invalid coupon code.');
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Tag size={16} className="text-primary" />
        <span>Apply Promo Coupon</span>
      </div>

      {appliedCoupon ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5 text-xs">
          <div>
            <p className="font-bold">{appliedCoupon.code} Applied!</p>
            <p className="text-[10px]">Saving ₹{appliedCoupon.discountAmount} on this order</p>
          </div>
          <button onClick={removeCoupon} className="text-rose-600 p-1">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-xs uppercase bg-background"
            />
            <Button size="sm" onClick={handleManualApply} className="text-xs">Apply</Button>
          </div>
          {error && <p className="text-[10px] text-rose-500">{error}</p>}

          <div className="space-y-1.5 pt-1">
            {AVAILABLE_COUPONS.map((c) => (
              <div
                key={c.code}
                onClick={() => handleApply(c)}
                className="flex items-center justify-between border border-dashed border-border hover:border-primary rounded-lg p-2 text-xs cursor-pointer bg-muted/20"
              >
                <div>
                  <span className="font-bold text-primary">{c.code}</span>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                </div>
                <span className="text-[10px] font-semibold text-primary">Apply</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
