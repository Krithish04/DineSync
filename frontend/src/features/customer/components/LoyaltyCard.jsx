import { Award, User, Coins, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TIER_DESCRIPTIONS = {
  Bronze: {
    bg: 'bg-gradient-to-br from-amber-800 to-amber-950 text-white',
    badge: 'bg-amber-700/30 text-amber-300 border-amber-500/40',
    multiplier: '1.0x points',
    nextThreshold: 10000,
    nextTier: 'Silver',
  },
  Silver: {
    bg: 'bg-gradient-to-br from-slate-400 to-slate-700 text-white',
    badge: 'bg-slate-500/30 text-slate-200 border-slate-300/40',
    multiplier: '1.2x points',
    nextThreshold: 30000,
    nextTier: 'Gold',
  },
  Gold: {
    bg: 'bg-gradient-to-br from-yellow-500 to-amber-700 text-white',
    badge: 'bg-yellow-500/30 text-yellow-100 border-yellow-300/40',
    multiplier: '1.5x points',
    nextThreshold: 75000,
    nextTier: 'Platinum',
  },
  Platinum: {
    bg: 'bg-gradient-to-br from-violet-600 via-indigo-900 to-slate-900 text-white',
    badge: 'bg-violet-500/30 text-violet-100 border-violet-400/40',
    multiplier: '2.0x points',
    nextThreshold: Infinity,
    nextTier: '',
  },
};

export default function LoyaltyCard({ customer }) {
  const tier = customer.membershipTier || 'Bronze';
  const theme = TIER_DESCRIPTIONS[tier];

  // Calculate progress
  const progressPercent = theme.nextThreshold === Infinity
    ? 100
    : Math.min(100, Math.round((customer.totalSpent / theme.nextThreshold) * 100));

  return (
    <Card className={`relative overflow-hidden border border-border/10 shadow-lg ${theme.bg}`}>
      {/* Decorative background vectors */}
      <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
        <Award className="h-64 w-64" />
      </div>

      <CardContent className="p-5 flex flex-col justify-between h-[180px]">
        {/* Top block */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${theme.badge}`}>
              <Award className="h-3 w-3" />
              {tier} Tier
            </span>
            <h3 className="text-base font-bold tracking-tight mt-2">{customer.fullName}</h3>
            <p className="text-[10px] opacity-75 font-mono">{customer.customerId}</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] opacity-75 block uppercase font-semibold">Points balance</span>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <Coins className="h-4.5 w-4.5 text-yellow-400 fill-yellow-400 shrink-0" />
              <span className="font-mono text-xl font-black">{customer.loyaltyPoints?.toLocaleString() || 0}</span>
            </div>
            <span className="text-[9px] opacity-75 italic block mt-0.5">{theme.multiplier}</span>
          </div>
        </div>

        {/* Bottom progress bar */}
        <div className="space-y-1.5 pt-4">
          {theme.nextThreshold !== Infinity ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] opacity-80">
                <span>Progress to {theme.nextTier} (₹{customer.totalSpent?.toFixed(0)} spent)</span>
                <span>₹{theme.nextThreshold?.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-[9px] opacity-85 font-semibold tracking-wider uppercase text-center bg-white/10 py-1 rounded">
              Elite Platinum Member status achieved
            </p>
          )}

          <div className="flex justify-between text-[9px] opacity-80 pt-0.5 border-t border-white/10 font-mono">
            <span>Referral: {customer.referralCode}</span>
            {customer.visitCount > 0 && <span>Visits: {customer.visitCount}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
