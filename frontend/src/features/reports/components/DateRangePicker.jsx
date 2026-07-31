/**
 * DateRangePicker — from/to date pair using native <input type="date">
 * Styled to match the project's design tokens.
 */
export default function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-xs font-medium text-muted-foreground shrink-0">From</label>
      <input
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(e) => onChange({ startDate: e.target.value, endDate })}
        className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <label className="text-xs font-medium text-muted-foreground shrink-0">To</label>
      <input
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => onChange({ startDate, endDate: e.target.value })}
        className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
