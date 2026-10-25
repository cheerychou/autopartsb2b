/**
 * 管理端 JWT token 存取（过渡实现集中于此；买家端同构见 storefront-web/src/lib/token.ts）。
 * 后端切 httpOnly cookie 方案时只改本文件。禁止业务代码裸用 localStorage 存 token。
 */

const TOKEN_KEY = "b1ru_admin_token";

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
    /* 忽略 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 忽略 */
  }
}
