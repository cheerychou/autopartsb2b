import * as React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../ui/chart';
import { cn } from "cn";
import type { ColumnChartProps, ChartDataPoint } from './chart.types';
import { buildChartConfig } from './chart.types';

/**
 * 柱状图组件（shadcn/ui 规范）
 * 使用 ChartContainer 管理主题色，ChartTooltipContent 渲染标准 tooltip
 */
const ColumnChart = React.forwardRef<HTMLDivElement, ColumnChartProps>(
  ({
    data,
    height = 400,
    className,
    style,
    margin = { top: 20, right: 30, left: 20, bottom: 5 },
    loading = false,
    xField,
    yField,
    title,
    legend = { visible: true, position: 'top' },
    tooltip = { enabled: true },
    layout = 'vertical',
    barSize,
    maxBarSize,
    color,
    xAxis,
    yAxis,
    grid = { horizontal: true, vertical: false },
    label = false,
    onBarClick,
    stackMode = 'group',
    stackId,
    animation = true,
    animationDuration = 1000,
    config: externalConfig,
    ...props
  }, ref) => {
    const chartHeight = typeof height === 'number' ? height : 400;

    const yFields = Array.isArray(yField) ? yField : [yField];
    const colors = Array.isArray(color) ? color : color ? [color] : [];

    const chartConfig = externalConfig || buildChartConfig(yFields, colors);

    const renderTitle = () => {
      if (!title) return null;
      const titleConfig = typeof title === 'string' ? { text: title, visible: true } : title;
      if (!titleConfig.visible || !titleConfig.text) return null;
      return (
        <div className="text-lg font-semibold text-center mb-4" style={titleConfig.style}>
          {titleConfig.text}
        </div>
      );
    };

    const renderBars = () => {
      return yFields.map((field) => {
        const currentStackId = stackMode === 'stack' ? (stackId || 'stack-all') : undefined;
        const labelConfig = typeof label === 'boolean' ? { position: 'top' } : label;
        const labelProps: Record<string, unknown> = {
          position: labelConfig.position,
          fill: 'var(--color-foreground)',
          fontSize: 12,
        };
        if (typeof labelConfig === 'object' && 'formatter' in labelConfig && labelConfig.formatter) {
          (labelProps as Record<string, unknown>).formatter = labelConfig.formatter;
        }

        return (
          <Bar
            key={field}
            dataKey={field}
            fill={`var(--color-${field})`}
            barSize={barSize}
            maxBarSize={maxBarSize}
            stackId={currentStackId}
            radius={[4, 4, 0, 0]}
            isAnimationActive={animation}
            animationDuration={animationDuration}
            onClick={onBarClick ? ((data: unknown) => {
              onBarClick(data as ChartDataPoint, 0);
            }) : undefined}
            label={label ? labelProps : false}
          />
        );
      });
    };

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn('flex items-center justify-center', className)}
          style={{ height: chartHeight, ...style }}
          {...props}
        >
          <div className="text-muted-foreground">加载中...</div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('w-full', className)} style={style} {...props}>
        {renderTitle()}
        <ChartContainer config={chartConfig} className={cn('w-full')} style={{ height: chartHeight, aspectRatio: undefined }}>
          <RechartsBarChart data={data} margin={margin} layout={layout}>
            {grid.horizontal && grid.vertical && <CartesianGrid strokeDasharray="3 3" />}
            {grid.horizontal && !grid.vertical && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            {!grid.horizontal && grid.vertical && <CartesianGrid strokeDasharray="3 3" horizontal={false} />}

            <XAxis
              dataKey={xField}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              type={layout === 'vertical' ? 'category' : 'number'}
              {...xAxis}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              type={layout === 'vertical' ? 'number' : 'category'}
              {...(yAxis && { padding: yAxis.padding as { left?: number; right?: number; top?: number; bottom?: number } })}
            />

            {tooltip.enabled !== false && (
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={tooltip.formatter as unknown as any}
                  />
                }
                cursor={tooltip.cursor}
              />
            )}

            {legend.visible && (
              <ChartLegend
                content={
                  <ChartLegendContent
                    verticalAlign={legend.verticalAlign === 'top' ? 'top' : 'bottom'}
                  />
                }
              />
            )}

            {renderBars()}
          </RechartsBarChart>
        </ChartContainer>
      </div>
    );
  }
);

ColumnChart.displayName = 'ColumnChart';

export { ColumnChart };
