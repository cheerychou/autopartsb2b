/**
 * 防御性格式化工具集（P0-2，ADT-ALL-004 §4-2 + §4.4-4 拍板）
 *
 * 后端字段可能为 null / undefined / string / 脏格式，直接 .toFixed() / date-fns format
 * 会抛错拖垮整页（先例：WorkOrderList 对 Invalid time value 的防御，KNW 系教训）。
 * 本工具集统一兜底：非法输入返回 fallback / 0，绝不抛错。
 *
 * 行为基准（现存多份实现的收敛）：
 * - formatMoney 以 store-web utils/format.ts 蓝本为基，按 §4.4-4 拍板合并千分位
 *   （原 toFixed 实现与注释不符，无千分位）并参数化 decimals；
 * - maskPhone 以 store-web utils/formatting/string.ts 正则版为基；
 * - formatFileSize 吸收 platform-web Dashboard 方言（GB 1 位小数 / 其余整数）。
 */

import { format } from 'date-fns';

/** 安全转换为 number，非法值返回 0（蓝本原样上收） */
export function toNumber(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/** 安全转换为 Date，非法/空值返回 null */
function toDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 金额：¥ 前缀 + 千分位 + 固定小数位（§4.4-4 拍板形态）。
 * 财务/结算场景一律默认 2 位；sales 概览/估值场景可传 0。
 *
 * @example formatMoney(1234.5)      // '¥1,234.50'
 * @example formatMoney('12500', 0)  // '¥12,500'
 */
export function formatMoney(v: unknown, decimals = 2): string {
  return `¥${formatNumber(v, decimals)}`;
}

/** 数字：千分位 + 固定小数位（默认 2 位），如 '1,234.50' */
export function formatNumber(v: unknown, decimals = 2): string {
  return toNumber(v).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 日期：yyyy-MM-dd；非法/空返回 fallback（默认 '-'）——替代 substring(0,10) 截断与裸 format */
export function formatDate(v: unknown, fallback = '-'): string {
  const d = toDate(v);
  return d ? format(d, 'yyyy-MM-dd') : fallback;
}

/** 日期时间：yyyy-MM-dd HH:mm；非法/空返回 fallback */
export function formatDateTime(v: unknown, fallback = '-'): string {
  const d = toDate(v);
  return d ? format(d, 'yyyy-MM-dd HH:mm') : fallback;
}

/** 万级缩写：≥1 万显示「x.x 万」（整数万不带小数），否则千分位整数——大盘概览场景 */
export function formatNumberCn(v: unknown): string {
  const n = toNumber(v);
  if (Math.abs(n) >= 10000) {
    const w = n / 10000;
    return `${Number.isInteger(w) ? w : w.toFixed(1)} 万`;
  }
  return n.toLocaleString('zh-CN');
}

/** 金额万级缩写：≥1 万「¥x.x 万」，否则「¥1,234」——大盘/概览金额场景（dashboard KPI） */
export function formatMoneyCn(v: unknown): string {
  return `¥${formatNumberCn(v)}`;
}

/** 相对时间：刚刚 / x 分钟前 / x 小时前 / x 天前；超 30 天退化为日期 */
export function formatRelativeTime(v: unknown, fallback = '-'): string {
  const d = toDate(v);
  if (!d) return fallback;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return '刚刚';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days} 天前`;
  return format(d, 'yyyy-MM-dd');
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

/** 文件大小：B/KB/MB/GB 阶梯；GB 保留 1 位小数、其余整数（platform-web Dashboard 方言） */
export function formatFileSize(bytes: unknown): string {
  const n = toNumber(bytes);
  if (n < KB) return `${n} B`;
  if (n < MB) return `${(n / KB).toFixed(0)} KB`;
  if (n < GB) return `${(n / MB).toFixed(0)} MB`;
  return `${(n / GB).toFixed(1)} GB`;
}

/** 手机号脱敏：138****8000；非标准 11 位号原样返回（含空串/null 兜底为空串） */
export function maskPhone(phone: unknown): string {
  return String(phone ?? '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
