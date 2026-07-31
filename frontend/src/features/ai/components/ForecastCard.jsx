import React from 'react';
import ConfidenceIndicator from './ConfidenceIndicator';

/**
 * ForecastCard — displaying predicted metrics, confidence scores, and trend badges
 */
export default function ForecastCard({
  title,
  value,
  subtitle,
  icon: Icon,
  confidence,
  prefix = '',
  suffix = '',
  variant = 'default',
}) {
  const variantStyles = {
    default: 'border-border bg-card',
    primary: 'border-primary/40 bg-primary/5',
    emerald: 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20',
    amber: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20',
    purple: 'border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20',
  };

  return (
    <div className={`border rounded-xl p-5 flex flex-col justify-between space-y-3 ${variantStyles[variant] || variantStyles.default}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {Icon && (
          <span className="p-2 rounded-lg bg-background border border-border shrink-0">
            <Icon size={18} className="text-primary" />
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold font-display text-foreground">
          {prefix}
          {typeof value === 'number' ? value.toLocaleString('en-IN') : (value ?? '—')}
          {suffix}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {confidence !== undefined && (
        <div className="pt-1 border-t border-border/50">
          <ConfidenceIndicator confidence={confidence} />
        </div>
      )}
    </div>
  );
}
