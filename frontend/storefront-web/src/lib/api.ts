/**
 * 买家侧 API 客户端（/storefront/v1）。
 *
 * 线格式 snake_case 全程透传（backend/CLAUDE.md：转换只准在 b1-shared-http 边界层，
 * 本仓 API 即 snake_case——不做 camelize）。错误包络 { error: { code, error_code, message_ru? } }。
 */
import { createApiClient } from "@cdd/b1-shared-http";

import { clearToken, getToken } from "@/lib/token";

export const api = createApiClient({
  baseURL: "/storefront/v1",
  basePath: "",
  timeout: 15000,
  getToken, // Bearer 注入（过渡实现见 lib/token.ts）
  onAuthFailure: () => clearToken(), // 401 即清会话，路由守卫负责跳登录
});

/** I1 目录查询（匿名可查，与 storefront 同源部署——29号§一）。 */
export const catalogApi = createApiClient({
  baseURL: "/catalog/v1",
  basePath: "",
  timeout: 15000,
});

export async function getCatalog<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await catalogApi.get(url, { params });
  return resp.data as T;
}

export interface BuyerErrorBody {
  error: { code: string; error_code: string; message_ru?: string };
}

export function errCode(e: unknown): string | null {
  if (typeof e === "object" && e !== null && "response" in e) {
    const resp = (e as { response?: { data?: BuyerErrorBody } }).response;
    return resp?.data?.error?.error_code ?? null;
  }
  return null;
}

/** 响应包络 { data, meta } 的类型化取值助手。 */
export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await api.get(url, { params });
  return resp.data as T;
}

export async function postData<T>(url: string, body?: unknown): Promise<T> {
  const resp = await api.post(url, body ?? {});
  return resp.data as T;
}
