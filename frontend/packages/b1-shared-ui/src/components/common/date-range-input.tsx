/**
 * DateRangeInput 组件
 *
 * 对 UnifiedDatePicker mode="range" 的字符串值封装。
 * 适配 SearchForm 等场景的字符串模式（"YYYY-MM-DD - YYYY-MM-DD"）。
 *
 * 开始日期自动补 00:00:00，结束日期自动补 23:59:59。
 */

import { format } from 'date-fns';
import { startOfDay, endOfDay } from 'date-fns';
import { parseDateRange } from '../../lib/date-utils';

import { UnifiedDatePicker } from '../form/unified-date-picker';

export interface DateRangeInputProps {
  /** 标签文字 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 当前值字符串，如 "YYYY-MM-DD - YYYY-MM-DD" */
  value: string;
  /** 占位文字 */
  placeholder?: string;
  /** 值变更回调（字符串格式） */
  onChange: (value: string) => void;
  /** 范围回调，返回起止日期（自动补全时间） */
  onChangeRange?: (start: string, end: string) => void;
  /** 分隔符 */
  separator?: string;
  /** 视觉尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 日历月数 */
  months?: number;
}

/**
 * DateRangeInput — 字符串模式的日期范围选择器
 *
 * 用于搜索表单等场景，输入输出都是字符串格式。
 * 开始日期自动补 00:00:00，结束日期自动补 23:59:59。
 */
export function DateRangeInput({
  label,
  required,
  value,
  placeholder = '请选择日期范围',
  onChange,
  onChangeRange,
  separator = ' - ',
  size = 'md',
  months = 2,
}: DateRangeInputProps) {
  const { start, end } = parseDateRange(value);
  const toDate = (s: string) => (s ? startOfDay(new Date(s)) : undefined);
  const pickerValue: [Date, Date] | undefined =
    start && end ? [toDate(start)!, toDate(end)!] : undefined;

  /**
   * 处理选择变更，自动补全时间并输出字符串
   */
  const handleChange = (v: Date | [Date, Date] | undefined) => {
    if (!v || !Array.isArray(v)) {
      onChange('');
      if (onChangeRange) onChangeRange('', '');
      return;
    }
    const s = format(startOfDay(v[0]), 'yyyy-MM-dd');
    const e = format(endOfDay(v[1]), 'yyyy-MM-dd');
    onChange(`${s}${separator}${e}`);
    if (onChangeRange) onChangeRange(s, e);
  };

  return (
    <UnifiedDatePicker
      mode="range"
      value={pickerValue}
      onChange={handleChange}
      placeholder={placeholder}
      label={label}
      required={required}
      numberOfMonths={months}
      size={size === 'lg' ? 'md' : size}
    />
  );
}

export default DateRangeInput;
