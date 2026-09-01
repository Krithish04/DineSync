import React from 'react';
import { Sparkles, Calculator, ShieldCheck, Cpu } from 'lucide-react';

/**
 * ExecutionModeBadge Component — Visually indicates whether a forecast or AI analytics dataset
 * originated from the Live FastAPI ML / Gemini Model or the Statistical Heuristic Fallback Engine.
 */
export default function ExecutionModeBadge({ executionMode, className = '' }) {
  const isLive = executionMode === 'AI_LIVE_MODEL' || executionMode === 'live_model' || executionMode === 'ai_microservice';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs transition-all ${
        isLive
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400'
          : 'bg-amber-500/15 text-amber-700 border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300'
      } ${className}`}
      title={
        isLive
          ? 'Generated via live FastAPI machine learning & Gemini AI model'
          : 'Generated via statistical heuristic fallback engine (FastAPI offline/standalone mode)'
      }
    >
      {isLive ? (
        <>
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
          <span>Live ML Model</span>
        </>
      ) : (
        <>
          <Calculator className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Heuristic Fallback</span>
        </>
      )}
    </div>
  );
}
