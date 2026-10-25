import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export interface ApiClientOptions {
  /** API path namespace, e.g. '/platform', '/digital-store' */
  basePath: string;
  /** Base URL prefix (default '/api/v1') */
  baseURL?: string;
  /** Called on each request to get the access token */
  getToken?: () => string | null;
  /** Called on each request to get the tenant ID */
  getTenantId?: () => string | null;
  /**
   * axios withCredentials（EA-SEC-011 P2）：cookie 通道显式声明。
   * 同源部署（生产 nginx 反代 / vite dev proxy）下技术非必需，但作为纵深
   * 与未来跨域拆分的前瞻配置；AuthClient 经此透传（内部实例不对外暴露）。
   */
  withCredentials?: boolean;
  /** Refresh the access token. Throw on failure. */
  refreshToken?: () => Promise<void>;
  /** Called when auth is unrecoverable (refresh failed or no token) */
  onAuthFailure?: () => void;
  /** Transform request body keys to snake_case (default false) */
  snakeCaseRequest?: boolean;
  /** Transform query params keys to snake_case (default false) */
  snakeCaseParams?: boolean;
  /** Transform response body keys to camelCase (default false) */
  camelCaseResponse?: boolean;
  /**
   * Envelope validation mode（ADT-ALL-003 FEQ-06，默认 'off' 向后兼容）：
   * - 'off'：静默解包（历史行为——后端 success:false 被当作成功数据返回给业务层）
   * - 'observe'：success:false 时 console.warn 记录但不打断（灰度观测期）
   * - 'strict'：success:false 抛业务错误（Error.businessMessage 携带原始文案）
   */
  envelopeValidation?: 'off' | 'observe' | 'strict';
  /** Request timeout in ms (default 10000) */
  timeout?: number;
}

/** Standard API response envelope */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig };
