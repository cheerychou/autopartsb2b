import * as React from 'react';
// 直接从兄弟组件源文件导入，避免 index ↔ status-filter 循环引用（详见 standard-list-page 注释）。
import { Button } from '../ui/button';
import { cn } from "cn";

export interface StatusFilterProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'tabs' | 'select';
  className?: string;
}

export function StatusFilter({
  options,
  value,
  onChange,
  variant = 'tabs',
  className,
}: StatusFilterProps) {
  if (variant === 'select') {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          onClick={() => onChange(option.value)}
          className={cn(
            value === option.value
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-background text-foreground hover:bg-muted border-input'
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
