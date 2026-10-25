/**
 * 日期范围解析和规范化工具函数
 */

/**
 * 解析日期范围字符串为起始和结束日期
 *
 * @param value 日期范围字符串，如 "2024-01-01 - 2024-01-31"
 * @returns 包含 start 和 end 的对象
 */
export function parseDateRange(value: string): { start: string; end: string } {
  if (!value) {
    return { start: '', end: '' };
  }

  const trimmed = value.trim();
  const separatorIndex = trimmed.indexOf(' - ');

  if (separatorIndex === -1) {
    return { start: trimmed, end: '' };
  }

  return {
    start: trimmed.slice(0, separatorIndex).trim(),
    end: trimmed.slice(separatorIndex + 3).trim(),
  };
}

/**
 * 规范化日期范围字符串，将中文"至"替换为标准分隔符
 *
 * @param value 日期范围字符串
 * @param separator 分隔符，默认为 " - "
 * @returns 规范化后的日期范围字符串
 */
export function normalizeDateRange(value: string | null | undefined, separator: string = ' - '): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const zhiIdx = trimmed.indexOf('至');
  if (zhiIdx === -1) return trimmed;

  const before = trimmed.slice(0, zhiIdx).trim();
  const after = trimmed.slice(zhiIdx + 1).trim();

  if (before && after) return `${before}${separator}${after}`;
  if (before) return before;
  if (after) return `${separator}${after}`;
  return '';
}
