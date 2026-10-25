/**
 * 将任意 error 归一化为用户友好的错误消息字符串。
 *
 * 统一消除调用方手写 `error?.message ?? '加载失败'` 的重复逻辑。
 * 处理顺序：
 *   - falsy（null/undefined/''）→ fallback
 *   - string → 直接使用
 *   - Error → businessMessage（strict 信封业务文案，拦截器挂载）最优先；
 *     兜底剥 `[CODE]` 技术前缀；再取 `.message`，空则 fallback
 *   - 含 message 字段的对象 → 取该字段
 *   - 其他 → fallback
 *
 * 2026-10-11 ADT-ALL-004 §5.4：platform-web 增强版（ADT-OP-003 N10 产物）
 * 下沉合并至此，三端统一；platform-web 的 getErrorMessage 已改为本函数薄适配。
 */
export function toErrorMessage(error: unknown, fallback = '加载失败'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    // strict 信封错误的业务文案（shared-http 拦截器挂载），最优先
    const businessMessage = (error as Error & { businessMessage?: string }).businessMessage;
    if (businessMessage) return businessMessage;
    // 兜底剥离 [CODE] 前缀（observe 模式或未挂 businessMessage 的场景）
    const unwrapped = /^\[[^\]]+\]\s*(.+)$/.exec(error.message)?.[1];
    if (unwrapped) return unwrapped;
    return error.message || fallback;
  }
  if (typeof error === 'object' && error !== null) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}
