import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KpiCard — a compact metric display used across all report dashboards.
 * Shows a label, value, optional trend badge, and an icon.
 */
export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,       // 'up' | 'down' | 'neutral'
  trendLabel,
  prefix = '',
  suffix = '',
  colorClass = 'text-primary',
  bgClass = 'bg-primary/10',
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-muted-foreground';

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <span className={`p-2 rounded-lg ${bgClass}`}>
            <Icon size={18} className={colorClass} />
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-foreground font-display">
          {prefix}
          {typeof value === 'number' ? value.toLocaleString('en-IN') : (value ?? '—')}
          {suffix}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={13} />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
