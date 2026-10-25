import * as React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

/**
 * Progress component.
 * Renders a simple progress bar using Tailwind classes.
 */
export function Progress({ value = 0, className, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={['w-full bg-muted rounded', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default Progress;
