import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Visual indicator showing prediction confidence percentage with color-coded badge and bar
 */
export default function ConfidenceIndicator({ confidence = 0.85, label = 'AI Confidence' }) {
  const pct = Math.round(confidence * 100);
  const colorClass =
    pct >= 85
      ? 'bg-emerald-500 text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
      : pct >= 70
      ? 'bg-amber-500 text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-rose-500 text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300';

  const barColor = pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
        <Sparkles size={12} className="shrink-0" />
        <span>{pct}% {label}</span>
      </div>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0 hidden sm:block">
        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
