import * as React from "react";
import { cn } from "cn";

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: StatusTone;
}

/**
 * 状态标签组件
 * 用于展示对象的业务状态，如订单状态、任务状态等
 * @param tone - 状态语义级别
 * @param children - 展示文案
 */
const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ tone, className, children, ...props }, ref) => {
    const toneClass =
      tone === 'success'
        ? 'bg-stat-3-soft text-stat-3 border border-stat-3-soft'
        : tone === 'warning'
        ? 'bg-warning-soft text-warning border border-warning-soft'
        : tone === 'danger'
        ? 'bg-destructive-soft text-destructive border border-destructive-soft'
        : tone === 'info'
        ? 'bg-stat-6-soft text-stat-6 border border-stat-6-soft'
        : 'bg-muted text-muted-foreground border border-muted-foreground/20';

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors', toneClass, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge };
