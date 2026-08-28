import React from 'react';
import { CheckCircle2, Clock, UtensilsCrossed, ChefHat, Bell, AlertTriangle } from 'lucide-react';

const STAGES = [
  { key: 'Pending', label: 'Received', icon: Clock, color: '#8B8078', bg: 'bg-[#8B8078]/10', text: 'text-[#8B8078]', border: 'border-[#8B8078]' },
  { key: 'Accepted', label: 'Accepted', icon: CheckCircle2, color: '#2F6FED', bg: 'bg-[#2F6FED]/10', text: 'text-[#2F6FED]', border: 'border-[#2F6FED]' },
  { key: 'Preparing', label: 'Preparing', icon: ChefHat, color: '#E8A93C', bg: 'bg-[#E8A93C]/10', text: 'text-[#E8A93C]', border: 'border-[#E8A93C]' },
  { key: 'Ready', label: 'Ready', icon: Bell, color: '#2FA86E', bg: 'bg-[#2FA86E]/10', text: 'text-[#2FA86E]', border: 'border-[#2FA86E]' },
  { key: 'Served', label: 'Served', icon: UtensilsCrossed, color: '#6B5B95', bg: 'bg-[#6B5B95]/10', text: 'text-[#6B5B95]', border: 'border-[#6B5B95]' },
];

export default function OrderTimeline({ currentStatus = 'Pending' }) {
  let currentIdx = STAGES.findIndex((s) => s.key === currentStatus);
  if (currentIdx === -1) {
    if (currentStatus === 'Completed') currentIdx = STAGES.length - 1;
    else currentIdx = 0;
  }

  const currentStage = STAGES[currentIdx] || STAGES[0];
  const progressPercent = (currentIdx / (STAGES.length - 1)) * 100;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs" aria-live="polite">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kitchen Preparation Progress</h4>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${currentStage.bg} ${currentStage.text} border ${currentStage.border}/30 flex items-center gap-1.5`}>
          <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentStage.color }} />
          {currentStage.label}
        </span>
      </div>

      <div className="relative flex items-center justify-between pt-1 pb-2">
        {/* Track Line Background */}
        <div className="absolute left-4 right-4 top-5 h-1 bg-muted rounded-full -z-0" />
        
        {/* Filled Progress Line */}
        <div
          className="absolute left-4 top-5 h-1 rounded-full transition-all duration-700 ease-out -z-0"
          style={{
            width: `calc(${progressPercent}% * 0.88)`,
            backgroundColor: currentStage.color,
          }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center gap-1 text-center min-w-[50px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCurrent
                    ? 'text-white border-transparent shadow-md scale-110 ring-4 ring-primary/20'
                    : isPassed
                    ? `${stage.bg} ${stage.text} ${stage.border}`
                    : 'bg-card text-muted-foreground border-border'
                }`}
                style={isCurrent ? { backgroundColor: stage.color } : {}}
              >
                <Icon size={15} className={isCurrent ? 'animate-pulse' : ''} />
              </div>
              <span
                className={`text-[9px] sm:text-xs text-center font-medium leading-tight max-w-[54px] truncate ${
                  isCurrent
                    ? 'font-bold'
                    : isPassed
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground'
                }`}
                style={isCurrent ? { color: stage.color } : {}}
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
