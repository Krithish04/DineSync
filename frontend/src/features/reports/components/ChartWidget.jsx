import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  Tooltip,
  XAxis, YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

const PALETTE = ['#c2440f', '#82b34e', '#f5a623', '#4a90d9', '#9b59b6', '#1abc9c', '#e74c3c'];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'hsl(var(--foreground))',
  },
  cursor: { fill: 'hsl(var(--muted)/0.5)' },
};

/**
 * ChartWidget — unified chart wrapper supporting:
 *   type: 'line' | 'bar' | 'area' | 'pie' | 'donut'
 *
 * Common props:
 *   data        – array of data objects
 *   xKey        – key for x-axis (line/bar/area)
 *   dataKeys    – array of { key, label, color? } (line/bar/area)
 *   nameKey     – key for pie/donut label
 *   valueKey    – key for pie/donut value
 *   height      – number, default 260
 *   title       – optional chart title
 *   emptyLabel  – text to show when data is empty
 */
export default function ChartWidget({
  type = 'bar',
  data = [],
  xKey = '_id',
  dataKeys = [{ key: 'value', label: 'Value' }],
  nameKey = 'name',
  valueKey = 'value',
  height = 260,
  title,
  yAxisPrefix = '',
  emptyLabel = 'No data available for the selected period.',
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        {title && <p className="text-sm font-semibold text-foreground mb-4">{title}</p>}
        <div style={{ height }} className="flex items-center justify-center text-muted-foreground text-sm">
          {emptyLabel}
        </div>
      </div>
    );
  }

  const hasRightAxis = dataKeys.some((dk) => dk.yAxisId === 'right');

  const formatYTick = (val) => (yAxisPrefix ? `${yAxisPrefix}${val.toLocaleString()}` : val);

  const customTooltipStyle = {
    ...TOOLTIP_STYLE,
    formatter: (val, name) => [
      typeof val === 'number' ? `${yAxisPrefix ? `${yAxisPrefix}` : ''}${val.toLocaleString()}` : val,
      name,
    ],
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            {hasRightAxis ? (
              <>
                <YAxis yAxisId="left" tickFormatter={formatYTick} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              </>
            ) : (
              <YAxis tickFormatter={formatYTick} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            )}
            <Tooltip {...customTooltipStyle} />
            {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {dataKeys.map((dk, i) => (
              <Line
                key={dk.key}
                yAxisId={dk.yAxisId || (hasRightAxis ? 'left' : undefined)}
                type="monotone"
                dataKey={dk.key}
                name={dk.label}
                stroke={dk.color || PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={data.length === 1 ? { r: 5, fill: dk.color || PALETTE[i % PALETTE.length] } : false}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              {dataKeys.map((dk, i) => (
                <linearGradient key={dk.key} id={`grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={dk.color || PALETTE[i % PALETTE.length]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={dk.color || PALETTE[i % PALETTE.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            {hasRightAxis ? (
              <>
                <YAxis yAxisId="left" tickFormatter={formatYTick} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              </>
            ) : (
              <YAxis tickFormatter={formatYTick} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            )}
            <Tooltip {...customTooltipStyle} />
            {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {dataKeys.map((dk, i) => (
              <Area
                key={dk.key}
                yAxisId={dk.yAxisId || (hasRightAxis ? 'left' : undefined)}
                type="monotone"
                dataKey={dk.key}
                name={dk.label}
                stroke={dk.color || PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                fill={`url(#grad-${dk.key})`}
                dot={data.length === 1 ? { r: 5, fill: dk.color || PALETTE[i % PALETTE.length] } : false}
                activeDot={{ r: 6 }}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            {hasRightAxis ? (
              <>
                <YAxis yAxisId="left" tickFormatter={formatYTick} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              </>
            ) : (
              <YAxis tickFormatter={formatYTick} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            )}
            <Tooltip {...customTooltipStyle} />
            {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {dataKeys.map((dk, i) => (
              <Bar
                key={dk.key}
                yAxisId={dk.yAxisId || (hasRightAxis ? 'left' : undefined)}
                dataKey={dk.key}
                name={dk.label}
                fill={dk.color || PALETTE[i % PALETTE.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        );

      case 'pie':
      case 'donut': {
        const innerRadius = type === 'donut' ? '55%' : 0;
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius="75%"
              innerRadius={innerRadius}
              paddingAngle={type === 'donut' ? 3 : 0}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...customTooltipStyle} />
          </PieChart>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {title && <p className="text-sm font-semibold text-foreground mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
