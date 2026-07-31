import React from 'react';
import ChartWidget from '@/features/reports/components/ChartWidget';

/**
 * TrendGraph — reusable graph component for predictive trends (forecast vs actuals)
 */
export default function TrendGraph({
  type = 'area',
  data = [],
  xKey = 'date',
  dataKeys = [{ key: 'predicted_revenue', label: 'Predicted Revenue (₹)', color: '#c2440f' }],
  height = 260,
  title,
}) {
  return (
    <ChartWidget
      type={type}
      data={data}
      xKey={xKey}
      dataKeys={dataKeys}
      height={height}
      title={title}
    />
  );
}
