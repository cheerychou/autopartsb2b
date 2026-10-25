import * as React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../ui/chart';
import type { ChartConfig } from '../ui/chart';
import { cn } from "cn";
import type { PieChartProps } from './chart.types';

/**
 * 饼图组件（shadcn/ui 规范）
 * 使用 ChartContainer 管理主题色，ChartTooltipContent 渲染标准 tooltip
 */
const PieChart = React.forwardRef<HTMLDivElement, PieChartProps>(
  ({
    data,
    height = 400,
    className,
    style,
    margin = { top: 20, right: 30, left: 20, bottom: 5 },
    loading = false,
    dataKey,
    nameKey = 'name',
    title,
    legend = { visible: true, position: 'right' },
    tooltip = { enabled: true },
    color,
    innerRadius,
    outerRadius = 80,
    label = false,
    labelLine = true,
    startAngle = 0,
    endAngle = 360,
    paddingAngle = 0,
    onSliceClick,
    animation = true,
    animationDuration = 1000,
    config: externalConfig,
    ...props
  }, ref) => {
    const chartHeight = typeof height === 'number' ? height : 400;

    const defaultColors = [
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-3)',
      'var(--color-chart-4)',
      'var(--color-chart-5)',
    ];
    const colors = color && color.length > 0 ? color : defaultColors;

    const chartConfig: ChartConfig = externalConfig || (() => {
      const config: ChartConfig = {};
      data.forEach((entry, index) => {
        const nameValue = String(entry[nameKey] || `item-${index}`);
        const resolvedColor = colors[index % colors.length];
        config[nameValue] = {
          label: nameValue,
          color: resolvedColor,
        };
      });
      return config;
    })();

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
          <RechartsPieChart margin={{ top: margin.top || 0, right: margin.right || 0, bottom: margin.bottom || 0, left: margin.left || 0 }}>
            {tooltip.enabled !== false && (
              <ChartTooltip
                content={<ChartTooltipContent nameKey={nameKey} hideLabel />}
              />
            )}

            {legend.visible && (
              <ChartLegend
                content={
                  <ChartLegendContent
                    nameKey={nameKey}
                    verticalAlign={legend.verticalAlign === 'top' ? 'top' : 'bottom'}
                  />
                }
              />
            )}

            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              startAngle={startAngle}
              endAngle={endAngle}
              paddingAngle={paddingAngle}
              label={label ? ((entry: any) => `${entry[nameKey]} ${((entry.percent ?? 0) * 100).toFixed(0)}%`) : false}
              labelLine={labelLine}
              isAnimationActive={animation}
              animationDuration={animationDuration}
              onClick={onSliceClick ? ((data: unknown) => onSliceClick(data as any, 0)) : undefined}
            >
              {data.map((entry, index) => {
                const nameValue = String(entry[nameKey] || `item-${index}`);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`var(--color-${nameValue})`}
                  />
                );
              })}
            </Pie>
          </RechartsPieChart>
        </ChartContainer>
      </div>
    );
  }
);

PieChart.displayName = 'PieChart';

export { PieChart };
