/**
 * 管理端 API 客户端（/api/v1；snake_case 透传，错误包络 { error: {...} }）。
 */
import { createApiClient } from "@cdd/b1-shared-http";

import { clearToken, getRefreshToken, getToken, setToken } from "@/lib/token";

export const api = createApiClient({
  baseURL: "/api/v1",
  basePath: "",
  timeout: 15000,
  getToken,
  onAuthFailure: () => clearToken(),
  // 401 → 单飞续期（client.ts 拦截器重放原请求）；裸 axios 防递归拦截
  refreshToken: async () => {
    // fetch 而非 axios 实例：避免 401 刷新递归进入本拦截器
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("no-refresh");
    const resp = await fetch("/api/v1/auth/token/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!resp.ok) throw new Error("refresh-failed");
    const access = ((await resp.json()) as { access?: string }).access;
    if (!access) throw new Error("refresh-failed");
    setToken(access);
  },
});

export function errCode(e: unknown): string | null {
  if (typeof e === "object" && e !== null && "response" in e) {
    const resp = (e as { response?: { data?: { error?: { error_code?: string; message?: string } } } })
      .response;
    return resp?.data?.error?.error_code ?? resp?.data?.error?.message ?? null;
  }
  return null;
}

export const catalogApi = createApiClient({
  baseURL: "/catalog/v1",
  basePath: "",
  timeout: 15000,
  getToken,
});

export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await api.get(url, { params });
  return resp.data as T;
}

export async function getCatalog<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await catalogApi.get(url, { params });
  return resp.data as T;
}

export async function postData<T>(url: string, body?: unknown): Promise<T> {
  const resp = await api.post(url, body ?? {});
  return resp.data as T;
}

export async function patchData<T>(url: string, body: unknown): Promise<T> {
  const resp = await api.patch(url, body);
  return resp.data as T;
}
