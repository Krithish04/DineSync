import React from 'react';
import { Sparkles, Activity } from 'lucide-react';

/**
 * ModelSourceBadge — Surfacing live AI model vs heuristic fallback mode.
 * Required per PRD & Design Brief.
 */
export default function ModelSourceBadge({ mode = 'AI_LIVE_MODEL' }) {
  const isLive = mode === 'AI_LIVE_MODEL';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs transition-all ${
        isLive
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
      }`}
      title={isLive ? 'Live predictive model via Python FastAPI' : 'Statistical heuristic fallback engine active'}
    >
      {isLive ? (
        <>
          <Sparkles size={13} className="text-emerald-600 animate-pulse" />
          <span>AI Live Model (FastAPI)</span>
        </>
      ) : (
        <>
          <Activity size={13} className="text-amber-600 animate-pulse" />
          <span>Heuristic Engine (Statistical Fallback)</span>
        </>
      )}
    </div>
  );
}
