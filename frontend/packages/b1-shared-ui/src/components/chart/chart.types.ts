import * as React from 'react';
import type { ChartConfig } from '../ui/chart';

export interface ChartDataPoint {
  [key: string]: string | number | Date;
}

export interface ChartAxisConfig {
  dataKey?: string;
  name?: string;
  label?: boolean;
  tick?: boolean;
  tickFormatter?: (value: unknown) => string;
  angle?: number;
  offset?: number;
  padding?: { left?: number; right?: number };
}

export interface ChartLegendConfig {
  visible?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  align?: 'start' | 'center' | 'end';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  iconType?: 'line' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye';
  formatter?: (value: string, entry: ChartDataPoint) => React.ReactNode;
}

export interface ChartTooltipConfig {
  enabled?: boolean;
  trigger?: 'hover' | 'click';
  formatter?: (value: unknown, name: string, props: ChartDataPoint) => React.ReactNode;
  contentStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  cursor?: { stroke?: string; strokeWidth?: number };
  isAnimationActive?: boolean;
}

export interface ChartTitleConfig {
  visible?: boolean;
  text?: string;
  style?: React.CSSProperties;
  offset?: number;
}

export interface BaseChartProps {
  data: ChartDataPoint[];
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  responsive?: boolean;
  loading?: boolean;
  config?: ChartConfig;
}

export interface LineChartProps extends BaseChartProps {
  xField: string;
  yField: string | string[];
  title?: string | ChartTitleConfig;
  legend?: ChartLegendConfig;
  tooltip?: ChartTooltipConfig;
  smooth?: boolean;
  dot?: boolean | { size?: number; fill?: string; stroke?: string; strokeWidth?: number };
  area?: boolean;
  areaStyle?: { fill?: string; fillOpacity?: number; stroke?: string };
  color?: string | string[];
  xAxis?: ChartAxisConfig;
  yAxis?: ChartAxisConfig;
  grid?: { horizontal?: boolean; vertical?: boolean };
  onPointClick?: (data: ChartDataPoint, index: number) => void;
  animation?: boolean;
  animationDuration?: number;
}

export interface BarChartProps extends BaseChartProps {
  xField: string;
  yField: string | string[];
  title?: string | ChartTitleConfig;
  legend?: ChartLegendConfig;
  tooltip?: ChartTooltipConfig;
  layout?: 'horizontal' | 'vertical';
  barSize?: number;
  maxBarSize?: number;
  color?: string | string[];
  xAxis?: ChartAxisConfig;
  yAxis?: ChartAxisConfig;
  grid?: { horizontal?: boolean; vertical?: boolean };
  label?: boolean | { position?: 'top' | 'right' | 'center' | 'bottom' | 'left'; formatter?: (value: unknown) => string };
  onBarClick?: (data: ChartDataPoint, index: number) => void;
  stackId?: string | number;
  animation?: boolean;
  animationDuration?: number;
}

export interface PieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey?: string;
  title?: string | ChartTitleConfig;
  legend?: ChartLegendConfig;
  tooltip?: ChartTooltipConfig;
  color?: string[];
  innerRadius?: number | string;
  outerRadius?: number | string;
  label?: boolean | { position?: 'inside' | 'outside'; formatter?: (value: unknown, name: string) => string };
  labelLine?: boolean;
  startAngle?: number;
  endAngle?: number;
  paddingAngle?: number;
  onSliceClick?: (data: ChartDataPoint, index: number) => void;
  animation?: boolean;
  animationDuration?: number;
}

export interface AreaChartProps extends BaseChartProps {
  xField: string;
  yField: string | string[];
  title?: string | ChartTitleConfig;
  legend?: ChartLegendConfig;
  tooltip?: ChartTooltipConfig;
  smooth?: boolean;
  color?: string | string[];
  xAxis?: ChartAxisConfig;
  yAxis?: ChartAxisConfig;
  grid?: { horizontal?: boolean; vertical?: boolean };
  stackId?: string | number;
  areaStyle?: { fill?: string; fillOpacity?: number; stroke?: string };
  dot?: boolean | { size?: number; fill?: string; stroke?: string; strokeWidth?: number };
  onAreaClick?: (data: ChartDataPoint, index: number) => void;
  animation?: boolean;
  animationDuration?: number;
}

export interface ColumnChartProps extends BaseChartProps {
  xField: string;
  yField: string | string[];
  title?: string | ChartTitleConfig;
  legend?: ChartLegendConfig;
  tooltip?: ChartTooltipConfig;
  layout?: 'horizontal' | 'vertical';
  barSize?: number;
  maxBarSize?: number;
  color?: string | string[];
  xAxis?: ChartAxisConfig;
  yAxis?: ChartAxisConfig;
  grid?: { horizontal?: boolean; vertical?: boolean };
  label?: boolean | { position?: 'top' | 'right' | 'center' | 'bottom' | 'left'; formatter?: (value: unknown) => string };
  onBarClick?: (data: ChartDataPoint, index: number) => void;
  stackMode?: 'stack' | 'group';
  stackId?: string | number;
  animation?: boolean;
  animationDuration?: number;
}

/**
 * 根据 color prop 生成 ChartConfig
 * 用于向后兼容旧的 API
 */
export function buildChartConfig(
  yFields: string[],
  colors: string[],
  labels?: Record<string, string>
): ChartConfig {
  const config: ChartConfig = {};
  const defaultColors = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
  ];

  yFields.forEach((field, index) => {
    const resolvedColor = colors[index % colors.length] || defaultColors[index % defaultColors.length];
    config[field] = {
      label: labels?.[field] || field,
      color: resolvedColor.startsWith('#') || resolvedColor.startsWith('hsl') || resolvedColor.startsWith('oklch')
        ? resolvedColor
        : defaultColors[index % defaultColors.length],
    };
  });

  return config;
}
