import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';

/**
 * AiInsightCard — displays actionable AI insights and recommendations
 */
export default function AiInsightCard({ title, description, category, actionText, onAction }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors flex flex-col justify-between space-y-3">
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
          <Lightbulb size={16} />
        </span>
        {category && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {category}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>

      {actionText && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
        >
          <span>{actionText}</span>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
