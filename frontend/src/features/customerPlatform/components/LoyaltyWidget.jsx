import { useState } from 'react';
import { Gift, Award, Star } from 'lucide-react';
import useCartStore from '../store/cart.store';

export default function LoyaltyWidget({ pointsBalance = 240, membershipTier = 'Gold' }) {
  const loyaltyPointsRedeemed = useCartStore((s) => s.loyaltyPointsRedeemed);
  const setLoyaltyPointsRedeemed = useCartStore((s) => s.setLoyaltyPointsRedeemed);

  const discountVal = (loyaltyPointsRedeemed / 10).toFixed(2);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Gift size={16} className="text-amber-500" />
          <span>Loyalty Rewards & Points</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
          {membershipTier} Tier
        </span>
      </div>

      <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-lg">
        <div>
          <span className="text-muted-foreground">Available Balance</span>
          <p className="text-sm font-bold text-foreground font-display">{pointsBalance} Points</p>
        </div>
        <span className="text-[10px] text-muted-foreground">10 points = ₹1</span>
      </div>

      {pointsBalance > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Redeem Points: {loyaltyPointsRedeemed}</span>
            <span className="font-bold text-emerald-600">-₹{discountVal}</span>
          </div>
          <input
            type="range"
            min="0"
            max={pointsBalance}
            step="10"
            value={loyaltyPointsRedeemed}
            onChange={(e) => setLoyaltyPointsRedeemed(Number(e.target.value))}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
