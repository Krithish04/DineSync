import React from 'react';
import { Gift, Award, Star, CheckCircle } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import LoyaltyWidget from '../components/LoyaltyWidget';
import CouponSelector from '../components/CouponSelector';
import useCustomerAuthStore from '../store/customerAuth.store';

export default function CustomerLoyaltyDashboardPage() {
  const customer = useCustomerAuthStore((s) => s.customer);
  const pointsBalance = customer?.loyaltyPoints ?? 0;
  const membershipTier = customer?.membershipTier || 'Bronze';

  return (
    <CustomerLayout title="Loyalty & Rewards">
      <div className="space-y-4 max-w-full">
        {/* Tier Overview Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-primary/10 to-emerald-500/20 border border-amber-300 dark:border-amber-500/30 rounded-xl p-5 text-center space-y-2">
          <Award size={32} className="text-amber-500 mx-auto" />
          <h3 className="text-base font-bold font-display text-foreground">{membershipTier} Membership Status</h3>
          <p className="text-xs text-muted-foreground">Earn points on every order & redeem rewards at checkout!</p>
        </div>

        {/* Loyalty Widget */}
        <LoyaltyWidget pointsBalance={pointsBalance} membershipTier={membershipTier} />

        {/* Coupons */}
        <CouponSelector />
      </div>
    </CustomerLayout>
  );
}
