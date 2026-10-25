import * as React from 'react';
import { cn } from "cn";

export type ProgressType = 'line' | 'circle' | 'dashboard';

export interface ProgressProps {
  percent?: number;
  type?: ProgressType;
  status?: 'success' | 'exception' | 'active' | 'normal';
  showInfo?: boolean;
  strokeWidth?: number;
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeColor?: string | string[];
  trailColor?: string;
  format?: (percent: number) => string;
  size?: number | 'default' | 'small';
  gapDegree?: number;
  gapPosition?: 'top' | 'bottom' | 'left' | 'right';
  steps?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({
    percent = 0,
    type = 'line',
    status = 'normal',
    showInfo = true,
    strokeWidth = 8,
    strokeLinecap = 'round',
    strokeColor,
    trailColor = 'rgba(0, 0, 0, 0.06)',
    format,
    size = 'default',
    gapDegree = 0,
    gapPosition = 'top',
    steps,
    className,
    style,
    ...props
  }, ref) => {
    const normalizedPercent = Math.min(100, Math.max(0, percent));

    const getStatusColor = (): string => {
      if (status === 'success') return '#22c55e';
      if (status === 'exception') return '#ef4444';
      if (status === 'active') return '#3b82f6';
      if (Array.isArray(strokeColor)) return strokeColor[0] || '#3b82f6';
      return strokeColor || '#3b82f6';
    };

    const formatPercent = (p: number) => {
      if (format) return format(p);
      return `${p}%`;
    };

    const renderLineProgress = () => {
      const color = getStatusColor();

      if (steps && steps > 0) {
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: steps }).map((_, index) => {
              const stepPercent = ((index + 1) / steps) * 100;
              const isActive = normalizedPercent >= stepPercent;
              return (
                <div
                  key={index}
                  className={cn(
                    'h-1.5 rounded-sm transition-all duration-slow',
                    isActive ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{
                    width: `calc(${100 / steps}% - 4px)`,
                    backgroundColor: isActive ? (Array.isArray(strokeColor) ? strokeColor[0] : strokeColor) || '#3b82f6' : trailColor
                  }}
                />
              );
            })}
          </div>
        );
      }

      return (
        <div
          className="h-full rounded-full overflow-hidden transition-all duration-slow"
          style={{
            width: `${normalizedPercent}%`,
            backgroundColor: color,
            borderRadius: strokeLinecap === 'round' ? '9999px' : '0px'
          }}
        />
      );
    };

    const renderCircleProgress = () => {
      const sizeValue = typeof size === 'number' ? size : 120;
      const radius = (sizeValue - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (normalizedPercent / 100) * circumference;

      const color = getStatusColor();

      return (
        <div className="relative inline-flex items-center justify-center" style={{ width: sizeValue, height: sizeValue }}>
          <svg
            className="transform -rotate-90"
            width={sizeValue}
            height={sizeValue}
          >
            <circle
              cx={sizeValue / 2}
              cy={sizeValue / 2}
              r={radius}
              fill="none"
              stroke={trailColor}
              strokeWidth={strokeWidth}
            />
            <circle
              cx={sizeValue / 2}
              cy={sizeValue / 2}
              r={radius}
              fill="none"
              stroke={Array.isArray(color) ? color[0] : color}
              strokeWidth={strokeWidth}
              strokeLinecap={strokeLinecap}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-slow"
            />
          </svg>
          {showInfo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{formatPercent(normalizedPercent)}</span>
            </div>
          )}
        </div>
      );
    };

    const renderDashboardProgress = () => {
      const sizeValue = typeof size === 'number' ? size : 120;
      const radius = (sizeValue - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (normalizedPercent / 100) * circumference;

      const color = getStatusColor();
      const gapDegreeInRadians = (gapDegree * Math.PI) / 180;

      const startAngle = gapPosition === 'top' ? -Math.PI / 2 + gapDegreeInRadians / 2 :
                         gapPosition === 'bottom' ? Math.PI / 2 + gapDegreeInRadians / 2 :
                         gapPosition === 'left' ? Math.PI + gapDegreeInRadians / 2 :
                         gapDegreeInRadians / 2;

      return (
        <div className="relative inline-flex items-center justify-center" style={{ width: sizeValue, height: sizeValue }}>
          <svg
            width={sizeValue}
            height={sizeValue}
          >
            <circle
              cx={sizeValue / 2}
              cy={sizeValue / 2}
              r={radius}
              fill="none"
              stroke={trailColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference - (gapDegreeInRadians * radius)} ${gapDegreeInRadians * radius}`}
              transform={`rotate(${(startAngle * 180) / Math.PI + 90} ${sizeValue / 2} ${sizeValue / 2})`}
            />
            <circle
              cx={sizeValue / 2}
              cy={sizeValue / 2}
              r={radius}
              fill="none"
              stroke={Array.isArray(color) ? color[0] : color}
              strokeWidth={strokeWidth}
              strokeLinecap={strokeLinecap}
              strokeDasharray={`${circumference - (gapDegreeInRadians * radius)} ${gapDegreeInRadians * radius}`}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(${(startAngle * 180) / Math.PI + 90} ${sizeValue / 2} ${sizeValue / 2})`}
              className="transition-all duration-slow"
            />
          </svg>
          {showInfo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{formatPercent(normalizedPercent)}</span>
            </div>
          )}
        </div>
      );
    };

    const renderProgress = () => {
      switch (type) {
        case 'circle':
          return renderCircleProgress();
        case 'dashboard':
          return renderDashboardProgress();
        case 'line':
        default:
          return (
            <div className="flex items-center gap-4">
              <div
                className="flex-1 rounded-full overflow-hidden bg-muted transition-all duration-slow"
                style={{
                  height: typeof size === 'number' ? size : size === 'small' ? 4 : strokeWidth,
                  backgroundColor: trailColor
                }}
              >
                {renderLineProgress()}
              </div>
              {showInfo && (
                <span className="text-sm font-medium min-w-[3rem] text-right">
                  {formatPercent(normalizedPercent)}
                </span>
              )}
            </div>
          );
      }
    };

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} style={style} {...props}>
        {renderProgress()}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
