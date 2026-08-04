import DateRangePicker from './DateRangePicker';

/**
 * ReportFilters — a responsive filter bar used at the top of every report page.
 * Only renders the filters whose props are provided.
 *
 * Props:
 *   filters      – { startDate, endDate, branch, groupBy, ... }
 *   onChange     – (updates) => void
 *   branches     – array of { _id, name } for branch select
 *   showGroupBy  – show the Day/Week/Month/Year grouping picker
 */
export default function ReportFilters({ filters = {}, onChange, branches = [], showGroupBy = false }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl">
      {/* Date Range */}
      <DateRangePicker
        startDate={filters.startDate || ''}
        endDate={filters.endDate || ''}
        onChange={({ startDate, endDate }) => onChange({ ...filters, startDate, endDate })}
      />


      {/* Group By */}
      {showGroupBy && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Group By</label>
          <select
            value={filters.groupBy || 'day'}
            onChange={(e) => update('groupBy', e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      )}
    </div>
  );
}
