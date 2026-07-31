import React from 'react';
import { Tag, Sparkles } from 'lucide-react';

/**
 * RecommendationCard — display cards for cross-sell, upsell, and smart menu items
 */
export default function RecommendationCard({
  itemName,
  reason,
  score,
  category,
  badgeText,
  badgeColor = 'bg-primary/10 text-primary',
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{itemName}</h4>
        {badgeText && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badgeText}
          </span>
        )}
      </div>

      {reason && <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        {category && <span className="text-muted-foreground">{category}</span>}
        {score !== undefined && (
          <div className="flex items-center gap-1 text-primary font-semibold">
            <Sparkles size={12} />
            <span>Score: {Math.round(score * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
