/**
 * 买家 JWT token 存取（过渡实现，集中于此——后端 SimpleJWT Bearer 方案）。
 *
 * 背景：CDD3 authStorage 已按 httpOnly cookie 策略删除 token 方法（EA-SEC-011），
 * 本仓后端 v1 仍用 Authorization: Bearer。切 cookie 方案时只改本文件。
 * 禁止在业务代码裸用 localStorage 存 token（根 CLAUDE.md 禁止模式）。
 */

const TOKEN_KEY = "b1ru_auth_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* 隐私模式等场景忽略 */
  }
}


const REFRESH_KEY = "b1ru_auth_refresh";

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_KEY, token);
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* 忽略 */
  }
}
