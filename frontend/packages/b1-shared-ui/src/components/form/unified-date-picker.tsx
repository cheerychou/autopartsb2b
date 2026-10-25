/**
 * 统一日期时间选择器
 *
 * 合并原 DatePicker、DateTimePicker、DateRangePicker、RangePicker 为单一组件。
 * 通过 mode 属性切换三种选择模式：
 *   - 'date'       → 单日期（年月日）
 *   - 'datetime'   → 单日期时间（年月日 + 时分）
 *   - 'range'      → 日期范围（开始日期 ~ 结束日期）
 *
 * 使用示例：
 *   <UnifiedDatePicker mode="date" ... />
 *   <UnifiedDatePicker mode="datetime" ... />
 *   <UnifiedDatePicker mode="range" ... />
 */

import * as React from 'react';
import { format as formatDate, startOfDay, endOfDay, isBefore, isAfter, addDays, addMonths } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from "@phosphor-icons/react";
import type { DateRange } from 'react-day-picker';

import { cn } from "cn";
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { FormLabel } from './form-label';

/**
 * 选择模式
 */
export type UnifiedDatePickerMode = 'date' | 'datetime' | 'range';

/**
 * 预设快捷项
 */
export interface DatePickerPreset {
  label: string;
  /** 单日期或日期范围 */
  value: Date | [Date, Date];
}

export interface UnifiedDatePickerProps {
  /** 选择模式：date | datetime | range */
  mode?: UnifiedDatePickerMode;
  /** 当前值，单日期或日期范围元组 */
  value?: Date | [Date, Date];
  /** 值变更回调 */
  onChange?: (value: Date | [Date, Date] | undefined) => void;
  /** 占位文字 */
  placeholder?: string;
  /** 容器类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 标签文字 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 显示格式（仅影响按钮文字，不影响 onChange 返回值） */
  displayFormat?: string;
  /** 弹框尺寸：md（默认） | sm */
  size?: 'sm' | 'md' | 'lg';
  /** 禁用日期判断函数 */
  disabledDates?: (date: Date) => boolean;
  /** 最小可选日期 */
  minDate?: Date;
  /** 最大可选日期 */
  maxDate?: Date;
  /** 预设快捷项，仅在 mode='date' 或 mode='range' 时显示 */
  presets?: DatePickerPreset[];
  /** 日历显示月数，默认 mode 非 range 时 1 个月，range 时 2 个月 */
  numberOfMonths?: number;
}

/**
 * 将任意值解析为单日期
 */
function asSingleDate(v: Date | [Date, Date] | undefined): Date | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * 将任意值解析为日期范围
 */
function asDateRange(v: Date | [Date, Date] | undefined): DateRange | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) {
    return { from: v[0], to: v[1] };
  }
  return { from: v };
}

/**
 * 统一日期时间选择器
 */
export const UnifiedDatePicker = React.forwardRef<HTMLDivElement, UnifiedDatePickerProps>(
  (
    {
      mode = 'date',
      value,
      onChange,
      placeholder,
      className,
      disabled,
      label,
      required,
      displayFormat,
      size = 'md',
      disabledDates,
      minDate,
      maxDate,
      presets,
      numberOfMonths,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const isRange = mode === 'range';
    const defaultNumberOfMonths = isRange ? 2 : 1;
    const months = numberOfMonths ?? defaultNumberOfMonths;

    /**
     * 判断日期是否被禁用
     */
    const isDateDisabled = (date: Date) => {
      if (disabledDates?.(date)) return true;
      if (minDate && isBefore(date, startOfDay(minDate))) return true;
      if (maxDate && isAfter(date, endOfDay(maxDate))) return true;
      return false;
    };

    /**
     * 处理预设快捷项点击
     */
    const handlePresetClick = (preset: DatePickerPreset) => {
      if (Array.isArray(preset.value)) {
        onChange?.([startOfDay(preset.value[0]), endOfDay(preset.value[1])]);
      } else {
        if (mode === 'datetime') {
          onChange?.(preset.value);
        } else {
          onChange?.(startOfDay(preset.value));
        }
      }
      setOpen(false);
    };

    /**
     * 处理日历选择 — 单日期 / 日期范围
     */
    const handleCalendarSelect = (selected: Date | DateRange | undefined) => {
      if (!selected) {
        onChange?.(undefined);
        return;
      }

      if (isRange && typeof selected === 'object' && 'from' in selected) {
        const { from, to } = selected as DateRange;
        if (from && to) {
          onChange?.([startOfDay(from), endOfDay(to)]);
          setOpen(false);
        }
      } else if (selected instanceof Date) {
        if (mode === 'datetime') {
          const current = asSingleDate(value) || new Date();
          selected.setHours(current.getHours());
          selected.setMinutes(current.getMinutes());
          onChange?.(selected);
        } else {
          onChange?.(startOfDay(selected));
        }
        setOpen(false);
      }
    };

    /**
     * 处理时间变更（datetime 模式）
     */
    const handleTimeChange = (type: 'hour' | 'minute', val: string) => {
      const current = asSingleDate(value);
      if (!current) return;
      const next = new Date(current);
      if (type === 'hour') {
        next.setHours(parseInt(val));
      } else {
        next.setMinutes(parseInt(val));
      }
      onChange?.(next);
    };

    /**
     * 格式化显示文本
     */
    const formatDisplayValue = (): string => {
      if (!value) return placeholder ?? defaultPlaceholder();

      if (isRange) {
        const range = value as [Date, Date];
        const fmt = displayFormat ?? 'yyyy-MM-dd';
        return `${formatDate(range[0], fmt)} - ${formatDate(range[1], fmt)}`;
      }

      const d = value as Date;
      if (mode === 'datetime') {
        const fmt = displayFormat ?? 'yyyy-MM-dd HH:mm';
        return formatDate(d, fmt);
      }

      return formatDate(d, displayFormat ?? 'yyyy-MM-dd');
    };

    /**
     * 默认占位文字
     */
    function defaultPlaceholder(): string {
      switch (mode) {
        case 'datetime':
          return '选择日期时间';
        case 'range':
          return '请选择日期范围';
        default:
          return '选择日期';
      }
    }

    /**
     * 默认预设快捷项（仅 date/range 模式）
     */
    const defaultPresets: DatePickerPreset[] = [
      { label: '今天', value: startOfDay(new Date()) },
      { label: '昨天', value: addDays(startOfDay(new Date()), -1) },
      {
        label: '最近7天',
        value: [addDays(startOfDay(new Date()), -6), endOfDay(new Date())],
      },
      {
        label: '最近30天',
        value: [addDays(startOfDay(new Date()), -29), endOfDay(new Date())],
      },
      {
        label: '本月',
        value: [startOfDay(new Date()), endOfDay(new Date())],
      },
      {
        label: '上月',
        value: [
          startOfDay(addMonths(new Date(), -1)),
          endOfDay(addMonths(new Date(), -1)),
        ],
      },
    ];

    const activePresets =
      presets !== undefined ? presets : mode === 'datetime' ? [] : defaultPresets;

    const sizeClasses = size === 'sm' ? 'h-9 text-sm' : size === 'lg' ? 'h-12 text-base' : 'h-10 text-sm';

    const calendarSizeClass = size === 'sm' ? '[--cell-size:--spacing(6)]' : undefined;

    /**
     * 渲染时间选择区域（datetime 模式）
     */
    const renderTimeSection = () => {
      if (mode !== 'datetime') return null;
      const current = asSingleDate(value);
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const minutes = Array.from({ length: 60 }, (_, i) => i);

      return (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">时间选择</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={current ? current.getHours().toString() : undefined}
                onValueChange={(v) => handleTimeChange('hour', v ?? '')}
                disabled={!current}
              >
                <SelectTrigger aria-label="选择小时">
                  <SelectValue placeholder="时" />
                </SelectTrigger>
                <SelectContent className="h-48">
                  {hours.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center text-muted-foreground">:</div>
            <div className="flex-1">
              <Select
                value={current ? current.getMinutes().toString() : undefined}
                onValueChange={(v) => handleTimeChange('minute', v ?? '')}
                disabled={!current}
              >
                <SelectTrigger aria-label="选择分钟">
                  <SelectValue placeholder="分" />
                </SelectTrigger>
                <SelectContent className="h-48">
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {label && (
          <FormLabel required={required}>
            {label}
          </FormLabel>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left',
                  !value && 'text-muted-foreground',
                  sizeClasses,
                )}
                disabled={disabled}
              />
            }
          >
            <CalendarIcon className="h-4 w-4" />
            {formatDisplayValue()}
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="start"
            sideOffset={8}
            collisionPadding={16}
          >
            {activePresets.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border-b border-border">
                {activePresets.map((preset, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                   
                    onClick={() => handlePresetClick(preset)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}
            {isRange ? (
              <Calendar
                mode="range"
                selected={asDateRange(value)}
                onSelect={handleCalendarSelect}
                disabled={isDateDisabled}
                numberOfMonths={months}
                className={calendarSizeClass}
              />
            ) : (
              <Calendar
                mode="single"
                selected={asSingleDate(value)}
                onSelect={(date) => {
                  if (date) {
                    handleCalendarSelect(date);
                  } else {
                    onChange?.(undefined);
                  }
                }}
                disabled={isDateDisabled}
                numberOfMonths={months}
                className={calendarSizeClass}
              />
            )}
            {renderTimeSection()}
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

UnifiedDatePicker.displayName = 'UnifiedDatePicker';
