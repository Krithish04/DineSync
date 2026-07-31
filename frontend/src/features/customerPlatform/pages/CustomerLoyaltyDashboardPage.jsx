import React from 'react';
import { Gift, Award, Star, CheckCircle } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import LoyaltyWidget from '../components/LoyaltyWidget';
import CouponSelector from '../components/CouponSelector';

export default function CustomerLoyaltyDashboardPage() {
  return (
    <CustomerLayout title="Loyalty & Rewards">
      <div className="space-y-4 max-w-full">
        {/* Tier Overview Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-primary/10 to-emerald-500/20 border border-amber-300 rounded-xl p-5 text-center space-y-2">
          <Award size={32} className="text-amber-500 mx-auto" />
          <h3 className="text-base font-bold font-display text-foreground">Gold Membership Status</h3>
          <p className="text-xs text-muted-foreground">Earn 1.5x points on every order + free birthday dessert!</p>
        </div>

        {/* Loyalty Widget */}
        <LoyaltyWidget pointsBalance={240} membershipTier="Gold" />

        {/* Coupons */}
        <CouponSelector />
      </div>
    </CustomerLayout>
  );
}
