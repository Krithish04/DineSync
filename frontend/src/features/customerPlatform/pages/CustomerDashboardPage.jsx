import { useState } from 'react';
import { User, ShoppingBag, Heart, Gift, MapPin, ChevronRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '@/components/ui/button';

export default function CustomerDashboardPage() {
  const [profile, setProfile] = useState({
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+91 98765 43210',
    loyaltyPoints: 240,
    membershipTier: 'Gold',
  });

  const sampleOrders = [
    { id: 'ORD-9821', date: '2026-07-26', status: 'Completed', total: 680.0, items: 'Butter Chicken, Garlic Naan' },
    { id: 'ORD-9740', date: '2026-07-18', status: 'Completed', total: 420.0, items: 'Paneer Tikka, Veg Biryani' },
  ];

  return (
    <CustomerLayout title="Diner Profile & Orders">
      <div className="space-y-4">
        {/* User Card */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-base font-display">
            {profile.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold font-display text-foreground">{profile.fullName}</h3>
            <p className="text-xs text-muted-foreground">{profile.phone}</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            {profile.membershipTier} Member
          </span>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-card border border-border rounded-xl p-3 space-y-1">
            <span className="text-muted-foreground">Loyalty Points</span>
            <p className="text-lg font-bold text-primary font-display">{profile.loyaltyPoints} Pts</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 space-y-1">
            <span className="text-muted-foreground">Total Orders</span>
            <p className="text-lg font-bold text-foreground font-display">14 Orders</p>
          </div>
        </div>

        {/* Recent Order History */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Recent Order History</h4>
          </div>

          <div className="space-y-2">
            {sampleOrders.map((ord) => (
              <div key={ord.id} className="border border-border rounded-lg p-3 space-y-1 text-xs bg-muted/20">
                <div className="flex justify-between font-semibold">
                  <span>{ord.id}</span>
                  <span className="text-emerald-600 font-bold">{ord.status}</span>
                </div>
                <p className="text-muted-foreground text-[11px]">{ord.items}</p>
                <div className="flex justify-between text-[11px] pt-1 text-muted-foreground">
                  <span>{ord.date}</span>
                  <span className="font-bold text-foreground font-display">₹{ord.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
