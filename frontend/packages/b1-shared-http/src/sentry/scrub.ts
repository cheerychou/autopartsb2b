/**
 * 敏感数据脱敏逻辑（从 store-mobile-app/src/services/sentry-service.ts 移植）。
 *
 * 本文件是纯逻辑，无 React / @sentry 依赖，便于单测与跨端复用。
 * Web 端 3 个 Vite app 与未来其他端共享同一套 PII 脱敏规则，
 * 保证"上报给第三方（Sentry）的载荷不含个人敏感信息"这一合规底线一致。
 */

/**
 * 敏感数据脱敏正则。
 *
 * 顺序很重要：必须从长到短匹配，否则短模式会先吃掉长数字串内部的片段
 * （如 18 位身份证号中间 11 位会被手机号正则误匹配，破坏后续长模式匹配）。
 * - 身份证号：18 位（末位 X/x）
 * - 银行卡号：16-19 位连续数字
 * - 身份证号：15 位旧式
 * - 手机号：1 开头 11 位
 */
export const PII_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  { re: /[1-9]\d{16}[\dXx]/g, replacement: '[IDCARD]' },
  { re: /\b[1-9]\d{15,18}\b/g, replacement: '[CARDNUM]' },
  { re: /[1-9]\d{14}/g, replacement: '[IDCARD15]' },
  { re: /1[3-9]\d{9}/g, replacement: '[PHONE]' },
];

/** 需要从请求头/extra 中整字段删除的键名（不区分大小写） */
export const SENSITIVE_KEYS = [
  'authorization',
  'token',
  'access_token',
  'refresh_token',
  'cookie',
  'set-cookie',
  'password',
  'secret',
  'api_key',
  'apikey',
];

/**
 * 递归遍历对象，对字符串值做 PII 脱敏，并删除敏感键。
 * 返回处理后的副本，不修改原对象。
 *
 * @param value  任意值（字符串/数组/对象/其他）
 * @param depth  递归深度，防御过深嵌套（上限 6）
 */
export function scrubValue<T>(value: T, depth = 0): T {
  if (depth > 6) return value; // 防御过深递归
  if (typeof value === 'string') {
    let scrubbed: string = value;
    for (const { re, replacement } of PII_PATTERNS) {
      // 全局正则每次 replace 前需 reset lastIndex（避免连续调用残留状态）
      re.lastIndex = 0;
      scrubbed = scrubbed.replace(re, replacement);
    }
    return scrubbed as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => scrubValue(v, depth + 1)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) continue; // 整字段删除
      out[k] = scrubValue(v, depth + 1);
    }
    return out as unknown as T;
  }
  return value;
}
