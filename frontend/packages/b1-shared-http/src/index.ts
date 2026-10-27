export { createApiClient } from './client';
export type { AxiosInstance, ApiClientOptions, ApiEnvelope } from './types';
export { camelizeKeys, snakeizeKeys } from './case-transform';

// AuthClient — 统一认证中心客户端

// Sentry — PII 脱敏 + 浏览器配置工厂（供 Web app 复用，无 React 依赖）
export {
  scrubValue,
  PII_PATTERNS,
  SENSITIVE_KEYS,
  createSentryBrowserOptions,
} from './sentry';
export type { SentryInitOptions } from './sentry';
