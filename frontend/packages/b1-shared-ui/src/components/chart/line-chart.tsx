import * as React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../ui/chart';
import { cn } from "cn";
import type { LineChartProps, ChartDataPoint } from './chart.types';
import { buildChartConfig } from './chart.types';

/**
 * 折线图组件（shadcn/ui 规范）
 * 使用 ChartContainer 管理主题色，ChartTooltipContent 渲染标准 tooltip
 */
const LineChart = React.forwardRef<HTMLDivElement, LineChartProps>(
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
    smooth = false,
    dot = true,
    area = false,
    areaStyle = { fillOpacity: 0.3 },
    color,
    xAxis,
    yAxis,
    grid = { horizontal: true, vertical: false },
    onPointClick,
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

    const renderLines = () => {
      return yFields.map((field) => (
        <Line
          key={field}
          type={smooth ? 'monotone' : 'linear'}
          dataKey={field}
          stroke={`var(--color-${field})`}
          strokeWidth={2}
          dot={typeof dot === 'boolean' ? (dot ? { r: 3 } : false) : dot}
          activeDot={{ r: 5 }}
          isAnimationActive={animation}
          animationDuration={animationDuration}
          onClick={onPointClick ? ((data: unknown) => {
            onPointClick(data as ChartDataPoint, 0);
          }) : undefined}
        />
      ));
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
          <RechartsLineChart data={data} margin={margin}>
            {grid.horizontal && grid.vertical && <CartesianGrid strokeDasharray="3 3" />}
            {grid.horizontal && !grid.vertical && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            {!grid.horizontal && grid.vertical && <CartesianGrid strokeDasharray="3 3" horizontal={false} />}

            <XAxis
              dataKey={xField}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              {...xAxis}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              padding={yAxis?.padding as { left?: number; right?: number; top?: number; bottom?: number }}
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

            {renderLines()}
          </RechartsLineChart>
        </ChartContainer>
      </div>
    );
  }
);

LineChart.displayName = 'LineChart';

export { LineChart };
