import React from 'react';
import { CheckCircle2, Clock, UtensilsCrossed, ChefHat, Bell, Sparkles } from 'lucide-react';

const STAGES = [
  { key: 'Pending', label: 'Received', icon: Clock },
  { key: 'Accepted', label: 'Accepted', icon: CheckCircle2 },
  { key: 'Preparing', label: 'Preparing', icon: ChefHat },
  { key: 'Ready', label: 'Ready', icon: Bell },
  { key: 'Served', label: 'Served', icon: UtensilsCrossed },
];

export default function OrderTimeline({ currentStatus = 'Pending' }) {
  let currentIdx = STAGES.findIndex((s) => s.key === currentStatus);
  if (currentIdx === -1) {
    if (currentStatus === 'Completed') currentIdx = STAGES.length - 1;
    else currentIdx = 0;
  }

  const progressPercent = (currentIdx / (STAGES.length - 1)) * 100;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kitchen Progress</h4>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {currentStatus}
        </span>
      </div>

      <div className="relative flex items-center justify-between pt-1 pb-2">
        {/* Track Line Background */}
        <div className="absolute left-4 right-4 top-5 h-1 bg-muted rounded-full -z-0" />
        
        {/* Filled Progress Line */}
        <div
          className="absolute left-4 top-5 h-1 bg-primary rounded-full transition-all duration-700 ease-out -z-0"
          style={{ width: `calc(${progressPercent}% * 0.88)` }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-110 ring-4 ring-primary/20'
                    : isPassed
                    ? 'bg-primary/20 text-primary border-primary'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                <Icon size={16} className={isCurrent ? 'animate-pulse' : ''} />
              </div>
              <span
                className={`text-[10px] sm:text-xs text-center font-medium ${
                  isCurrent
                    ? 'text-primary font-bold'
                    : isPassed
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
