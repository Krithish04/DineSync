import React from 'react';
import { Gift, Award, Star, CheckCircle, Sparkles, ShieldCheck } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import LoyaltyWidget from '../components/LoyaltyWidget';
import CouponSelector from '../components/CouponSelector';
import useCustomerAuthStore from '../store/customerAuth.store';

const TIERS_LIST = [
  { name: 'Bronze', badge: '🥉', pointsNeeded: '0 - 99 Pts', perk: '5% Points Cashback' },
  { name: 'Silver', badge: '🥈', pointsNeeded: '100 - 499 Pts', perk: '7% Points Cashback + Free Beverage' },
  { name: 'Gold', badge: '🥇', pointsNeeded: '500 - 1999 Pts', perk: '10% Points Cashback + Priority Table Lock' },
  { name: 'Platinum', badge: '💎', pointsNeeded: '2000+ Pts', perk: '15% Points Cashback + VIP Chef Special' },
];

export default function CustomerLoyaltyDashboardPage() {
  const customer = useCustomerAuthStore((s) => s.customer);
  const pointsBalance = customer?.loyaltyPoints ?? 0;
  const membershipTier = customer?.membershipTier || 'Bronze';

  return (
    <CustomerLayout title="Loyalty & Rewards">
      <div className="space-y-4 max-w-full pb-4">
        {/* Tier Overview Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-primary/10 to-emerald-500/20 border border-amber-300 dark:border-amber-500/30 rounded-2xl p-5 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
            <Award size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-foreground">{membershipTier} Member Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Earn 1 point for every ₹10 spent. Redeem 10 points for ₹1 instant discount!
            </p>
          </div>
        </div>

        {/* Loyalty Widget */}
        <LoyaltyWidget pointsBalance={pointsBalance} membershipTier={membershipTier} />

        {/* Tier Perks Showcase Grid */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-display flex items-center gap-1.5">
            <Sparkles size={15} className="text-amber-500" /> Membership Tier Benefits
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TIERS_LIST.map((t) => {
              const isCurrent = t.name.toLowerCase() === membershipTier.toLowerCase();
              return (
                <div
                  key={t.name}
                  className={`border rounded-xl p-3 space-y-1 text-xs transition-all ${
                    isCurrent
                      ? 'bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20'
                      : 'bg-muted/30 border-border/70'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="text-base">{t.badge}</span>
                      <span className="text-foreground">{t.name}</span>
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground">{t.pointsNeeded}</p>
                  <p className="text-xs font-semibold text-primary pt-0.5">{t.perk}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coupons Selector */}
        <CouponSelector />
      </div>
    </CustomerLayout>
  );
}
