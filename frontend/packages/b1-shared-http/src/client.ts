import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiClientOptions } from './types';
import { camelizeKeys, snakeizeKeys } from './case-transform';

export type { AxiosInstance } from 'axios';
export type { ApiClientOptions, ApiEnvelope } from './types';
export { camelizeKeys, snakeizeKeys } from './case-transform';

/** 写方法集合（自动注入 Idempotency-Key） */
const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/**
 * in-flight 刷新去重（EA-SEC-011 §5.2）：模块级共享「进行中的 refresh
 * Promise」——并发 401 只放行一个 refreshToken() 调用，其余等待共享结果。
 *
 * 背景：后端 refresh 为 rotation 语义（旧会话 revoke + 新建），并发刷新时
 * 后到者携带的旧凭据已被先到者撤销 → 互踢。同一页面应用的多个 axios 实例
 * （store-web 主实例/platformHttp/dataPlatformHttp 等）的 refreshToken 回调
 * 最终都指向同一 authStore 动作，全局单飞语义正确。
 */
let _inflightRefresh: Promise<unknown> | null = null;

/**
 * 生成 Idempotency-Key（优先 crypto.randomUUID，降级 Date.now+random）。
 *
 * 用于写请求的请求级幂等（后端 @idempotent 装饰器据此去重）。
 * 无 crypto.randomUUID 的环境（老浏览器/SSR）走降级，保证不抛异常。
 */
function _genIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* crypto 可能在非安全上下文不可用，走降级 */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a configured Axios instance for the given API namespace.
 *
 * Features (all opt-in via options):
 * - Authorization header injection (getToken)
 * - X-Tenant-ID header injection (getTenantId)
 * - Response envelope unwrapping ({ success, data } -> data)
 * - 401 token refresh + request retry
 * - snake_case request body transform
 * - camelCase response body transform
 */
export function createApiClient(options: ApiClientOptions) {
  const {
    basePath,
    baseURL = '/api/v1',
    getToken,
    getTenantId,
    refreshToken,
    onAuthFailure,
    withCredentials,
    snakeCaseRequest = false,
    snakeCaseParams = false,
    camelCaseResponse = false,
    envelopeValidation = 'off',
    timeout = 10000,
  } = options;

  const api = axios.create({
    baseURL: `${baseURL}${basePath}`,
    timeout,
    // EA-SEC-011 P2：cookie 通道显式声明（同源下非必需，跨域部署时必需）
    withCredentials,
    headers: {
      'Content-Type': 'application/json',
    },
    paramsSerializer: snakeCaseParams
      ? (params: Record<string, unknown>) => {
          const snakeParams = snakeizeKeys(params) as Record<string, unknown>;
          const sp = new URLSearchParams();
          for (const [key, value] of Object.entries(snakeParams)) {
            if (value === undefined || value === null) continue;
            if (Array.isArray(value)) {
              value.forEach((v) => sp.append(key, String(v)));
            } else {
              sp.set(key, String(value));
            }
          }
          return sp.toString();
        }
      : undefined,
  });

  // ---- Request interceptor ----
  api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getToken?.();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const tenantId = getTenantId?.();
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }

      // 写方法自动注入 Idempotency-Key（请求级幂等，后端 @idempotent 装饰器据此去重）。
      // 已显式传入则不覆盖（调用方自定义 key 时尊重之）。
      const method = (config.method || 'get').toLowerCase();
      if (
        WRITE_METHODS.has(method) &&
        !config.headers?.['Idempotency-Key']
      ) {
        config.headers['Idempotency-Key'] = _genIdempotencyKey();
      }

      // FormData 上传：删除实例默认的 application/json，交给浏览器/axios
      // 自动设置带 boundary 的 multipart/form-data（否则后端 multipart 解析器 415）
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }

      if (
        snakeCaseRequest &&
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof FormData)
      ) {
        config.data = snakeizeKeys(config.data);
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // ---- Response interceptor ----
  api.interceptors.response.use(
    (response: AxiosResponse) => {
      const d = response.data;

      // Blob(以及同类二进制响应)在 camelizeKeys 下会被 Object.entries 视作空对象,
      // 返回 {},破坏 responseType: 'blob' 的下载。FormData 上传侧的同类检查见请求拦截器。
      const isBinary = typeof Blob !== 'undefined' && d instanceof Blob;

      if (camelCaseResponse && d && typeof d === 'object' && !isBinary) {
        response.data = camelizeKeys(d);
      }

      if (!isBinary && d && typeof d === 'object' && 'success' in d && 'data' in d) {
        // FEQ-06：信封校验（envelopeValidation 三态，见 types.ts）
        if (envelopeValidation !== 'off' && d.success === false) {
          const rawCode =
            typeof d.code !== 'undefined' && d.code !== null ? String(d.code) : 'UNKNOWN_ERROR';
          const rawMsg = typeof d.message === 'string' && d.message ? d.message : '请求失败';
          if (envelopeValidation === 'strict') {
            const bizError = new Error(`[${rawCode}] ${rawMsg}`);
            // 业务文案挂载：错误分类器不认识中文业务文案时透传原始 message
            (bizError as Error & { businessMessage?: string }).businessMessage = rawMsg;
            return Promise.reject(bizError);
          }
          // observe 观测期：记录命中但不打断（存量"静默解包"依赖待排查）
          console.warn(
            `[shared-http] envelope success=false (observe): [${rawCode}] ${rawMsg}`
          );
        }
        // 解包信封时对 data 做 camelCase（此前直接用原始 d.data 覆盖，
        // 导致 camelCaseResponse 对带信封的响应不生效，data 内仍是 snake_case）
        response.data = camelCaseResponse ? camelizeKeys(d.data) : d.data;
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry && refreshToken) {
        originalRequest._retry = true;

        try {
          // EA-SEC-011：并发 401 共享同一次刷新（rotation 下并发刷新互踢）
          if (!_inflightRefresh) {
            _inflightRefresh = Promise.resolve()
              .then(() => refreshToken())
              .finally(() => {
                _inflightRefresh = null;
              });
          }
          await _inflightRefresh;
          const newToken = getToken?.();
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          // cookie 通道（getToken 恒空）：重放自动携带刷新后的新 cookie，
          // 无需重拼 Authorization
          return api(originalRequest);
        } catch (_refreshError) {
          try { onAuthFailure?.(); } catch { /* callback errors must not mask the original error */ }
          return Promise.reject(_refreshError);
        }
      }

      return Promise.reject(error);
    },
  );

  return api;
}
