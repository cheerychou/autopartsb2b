/**
 * Sentry 模块公共导出。
 *
 * 脱敏逻辑（scrub）与配置工厂（createSentryBrowserOptions）均无 React 依赖，
 * 任意 Web app 均可通过 `@cdd/shared-http` 消费，保证 PII 脱敏规则全端一致。
 */
export { scrubValue, PII_PATTERNS, SENSITIVE_KEYS } from './scrub';
export { createSentryBrowserOptions } from './create-sentry-config';
export type { SentryInitOptions } from './create-sentry-config';
