import React from 'react';
import { CheckCircle2, Clock, UtensilsCrossed, ChefHat, Bell, Sparkles } from 'lucide-react';

const STAGES = [
  { key: 'Pending', label: 'Received', icon: Clock },
  { key: 'Accepted', label: 'Accepted', icon: CheckCircle2 },
  { key: 'Preparing', label: 'Preparing', icon: ChefHat },
  { key: 'Ready', label: 'Ready for Service', icon: Bell },
  { key: 'Served', label: 'Served', icon: UtensilsCrossed },
  { key: 'Completed', label: 'Completed', icon: Sparkles },
];

export default function OrderTimeline({ currentStatus = 'Pending' }) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStatus);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Status</h4>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {currentStatus}
        </span>
      </div>

      <div className="relative flex items-center justify-between">
        {/* Progress Line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted -z-0" />
        <div
          className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500 -z-0"
          style={{ width: `${(Math.max(0, currentIdx) / (STAGES.length - 1)) * 100}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-110'
                    : isPassed
                    ? 'bg-primary/20 text-primary border-primary'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                <Icon size={14} />
              </div>
              <span className={`text-[10px] font-medium text-center ${isPassed ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
