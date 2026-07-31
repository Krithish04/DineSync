/**
 * SummaryCard — a wider metric card used in financial/summary rows.
 * Supports a top label, a large value, and an optional description.
 */
export default function SummaryCard({ label, value, description, prefix = '', suffix = '', variant = 'default' }) {
  const variantMap = {
    default: 'border-border',
    success: 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30',
    warning: 'border-amber-400/40 bg-amber-50 dark:bg-amber-950/20',
    danger:  'border-rose-500/40 bg-rose-50 dark:bg-rose-950/20',
    info:    'border-sky-400/40 bg-sky-50 dark:bg-sky-950/20',
  };

  const textMap = {
    default: 'text-foreground',
    success: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger:  'text-rose-700 dark:text-rose-300',
    info:    'text-sky-700 dark:text-sky-300',
  };

  return (
    <div className={`bg-card border rounded-xl p-5 ${variantMap[variant] || variantMap.default}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold font-display ${textMap[variant] || textMap.default}`}>
        {prefix}
        {typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (value ?? '—')}
        {suffix}
      </p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}
