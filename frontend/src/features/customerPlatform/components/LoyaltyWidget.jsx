import { useState } from 'react';
import { Gift, Award, Star, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';
import useCartStore from '../store/cart.store';

const TIER_THRESHOLDS = {
  Bronze: { min: 0, next: 100, nextTier: 'Silver', badge: '🥉' },
  Silver: { min: 100, next: 500, nextTier: 'Gold', badge: '🥈' },
  Gold: { min: 500, next: 2000, nextTier: 'Platinum', badge: '🥇' },
  Platinum: { min: 2000, next: 2000, nextTier: 'Platinum Max', badge: '💎' },
};

export default function LoyaltyWidget({ pointsBalance, membershipTier }) {
  const loyaltyPointsRedeemed = useCartStore((s) => s.loyaltyPointsRedeemed);
  const setLoyaltyPointsRedeemed = useCartStore((s) => s.setLoyaltyPointsRedeemed);

  const discountVal = (loyaltyPointsRedeemed / 10).toFixed(2);
  const activePoints = pointsBalance ?? 0;
  const activeTier = membershipTier || 'Bronze';

  const tierInfo = TIER_THRESHOLDS[activeTier] || TIER_THRESHOLDS.Bronze;
  const pointsToNext = Math.max(0, tierInfo.next - activePoints);
  const progressPercent = Math.min(100, Math.max(5, (activePoints / tierInfo.next) * 100));

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground font-display">
          <Award size={18} className="text-amber-500" />
          <span>Loyalty Membership</span>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
          <span>{tierInfo.badge}</span>
          <span>{activeTier} Tier</span>
        </span>
      </div>

      {/* Progress Bar to Next Tier */}
      <div className="space-y-1.5 bg-muted/40 p-3.5 rounded-xl border border-border/60">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Points Balance</span>
          <span className="font-bold text-primary font-display text-sm">{activePoints} Pts</span>
        </div>

        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-primary to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-[11px] text-muted-foreground pt-0.5 flex items-center justify-between">
          <span>10 points = ₹1 instant discount</span>
          {activeTier !== 'Platinum' && (
            <span className="font-medium text-foreground">
              <strong>{pointsToNext} pts</strong> to {tierInfo.nextTier}
            </span>
          )}
        </p>
      </div>

      {/* Point Redemption Slider */}
      {activePoints > 0 && (
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Redeem Points on Order:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {loyaltyPointsRedeemed} Pts (-₹{discountVal})
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={activePoints}
            step="10"
            value={loyaltyPointsRedeemed}
            onChange={(e) => setLoyaltyPointsRedeemed(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer touch-manipulation"
          />
        </div>
      )}
    </div>
  );
}
