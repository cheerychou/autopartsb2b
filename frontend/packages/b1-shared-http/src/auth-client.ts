/**
 * 统一认证客户端（AuthClient）
 *
 * 所有前端应用通过此客户端接入认证中心，替代各应用分散的 auth API 调用。
 * 使用方式：
 *   import { authClient } from '@cdd/b1-shared-http';
 *   const result = await authClient.login({ username, password });
 */

import { createApiClient } from './client';
import type { ApiClientOptions } from './types';
import type { AxiosInstance } from 'axios';

// ---- 类型定义 ----

export interface LoginInput {
  username?: string;
  password?: string;
  phone?: string;
  sms_code?: string;
  login_type?: 'username' | 'phone';
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  roles: string[];
  avatar: string | null;
  tenantId: string | null;
}

export interface TokenResult {
  access: string;
  refresh: string;
  user: AuthUser;
  tenant: { id: string; name: string } | null;
}

export interface MeRole {
  code: string;
  name: string;
  /** 经 camelizeKeys 转换后的字段（后端原字段为 data_scope） */
  dataScope: string;
}

export interface MeResult {
  user: Record<string, unknown>;
  permissions: string[];
  /** 角色数组：后端 /auth/me/ 返回 [{code,name,data_scope}]，经 camelizeKeys 后为 [{code,name,dataScope}]；
   *  也可能是裸 role code 字符串数组（后端 §4.2 顶层 me.roles）。 */
  roles: MeRole[] | string[];
  organizations: Array<Record<string, unknown>>;
  /** 经 camelizeKeys 转换后的字段（后端原字段为 tenant_id） */
  tenantId: string | null;
}

// ---- 后端响应 → TokenResult 适配 ----

/**
 * 后端 /auth/token/ 与 /auth/refresh/ 的真实响应结构（经 client camelizeKeys 后）：
 *   { user, session: { sessionId, token, expiresAt }, organizations, tenantId }
 *
 * AuthClient 对外承诺 TokenResult（access/refresh），此处做字段映射，
 * 使两端消费方（store-web / platform-web 的 authStore）无需感知后端 session 模型。
 * refresh 用 session_id（后端刷新逻辑以 session_id 为凭证）。
 */

/**
 * 把后端返回的 roles 归一化为 role code 字符串数组。
 *
 * 兼容两种后端契约（均已经 client camelizeKeys 处理）：
 *   - 对象数组：[{id, role, roleName, roleCode, dataScope, ...}]  ← /auth/token/ 的 user.roles
 *   - 字符串数组：['platform_admin']                             ← /auth/me/ 顶层 roles
 *   - 空数组 / undefined → []
 */
function normalizeRoleCodes(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => {
      // 字符串数组：原样
      if (typeof r === 'string') return r;
      // 对象数组：取 roleCode（login 响应）或 code（me 响应）字段
      if (r && typeof r === 'object') {
        const obj = r as Record<string, unknown>;
        const code = obj.roleCode ?? obj.code ?? obj.role_code;
        if (typeof code === 'string') return code;
      }
      return null;
    })
    .filter((c): c is string => typeof c === 'string');
}

function mapTokenResult(raw: unknown): TokenResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const session = (r.session ?? {}) as Record<string, unknown>;
  const user = (r.user ?? {}) as Record<string, unknown>;
  const token = (session.token as string) || (r.access as string) || '';
  const sessionId = (session.sessionId as string) || '';
  const tenantId =
    (r.tenantId as string) ||
    (user.tenantId as string) ||
    (user.tenant_id as string) ||
    null;
  return {
    access: token,
    refresh: sessionId,
    user: {
      id: (user.id as string) || '',
      name: (user.name as string) || (user.realName as string) || '',
      phone: (user.phone as string) || (user.mobilePhone as string) || '',
      // 后端 roles 契约不一致：/auth/token/ 的 user.roles 是对象数组
      // [{id, role, roleName, roleCode, dataScope, ...}]（经 camelizeKeys），
      // 而 /auth/me/ 顶层 roles 是裸字符串数组 ['platform_admin']。
      // 此处统一归一化为 role code 字符串数组，避免下游把整个对象当文本渲染
      // 触发 React #31（Objects are not valid as a React child）。
      roles: normalizeRoleCodes(user.roles),
      avatar: (user.avatar as string | null) ?? null,
      tenantId,
    },
    tenant: tenantId ? { id: tenantId, name: (r.tenantName as string) || '' } : null,
  };
}

// ---- AuthClient 类 ----

export class AuthClient {
  private api: AxiosInstance;

  constructor(config: Omit<ApiClientOptions, 'basePath'>) {
    this.api = createApiClient({ ...config, basePath: '/auth/' });
  }

  /** 登录 */
  async login(input: LoginInput): Promise<TokenResult> {
    const res = await this.api.post('/token/', input);
    return mapTokenResult(res?.data ?? res);
  }

  /**
   * 刷新 token。
   *
   * 双形态（EA-SEC-011 P2）：
   * - `refresh(sessionId)`：body 传参 `{ refreshToken }`（历史形态，
   *   cookie 未接入端在迁移期使用，后端 body 凭证优先双轨兼容）；
   * - `refresh()`：无参发空 body——后端空 body 读 `cdd_refresh_token`
   *   httpOnly cookie（#700 双轨），新 access 由响应 Set-Cookie 承载，
   *   前端零回写。cookie 化端（store-web P1 / platform / data-platform P2）
   *   统一走此形态。
   */
  async refresh(refreshToken?: string): Promise<TokenResult> {
    // 后端 /auth/refresh/ 请求体字段为 refreshToken（值是 session_id）
    const res = await this.api.post(
      '/refresh/',
      refreshToken ? { refreshToken } : {},
    );
    return mapTokenResult(res?.data ?? res);
  }

  /** 校验权限 */
  async verify(permission: string): Promise<boolean> {
    const res = await this.api.post('/verify/', {
      permission,
    });
    const data = (res?.data ?? res) as { granted: boolean };
    return data?.granted ?? false;
  }

  /** 获取当前用户信息 */
  async me(): Promise<MeResult> {
    const res = await this.api.get('/me/');
    // 后端 /auth/me/ 响应被 ApiResponseMiddleware 双层信封包裹
    // （{success,data:{success,data:{user,roles,...}}}），client 拦截器只解一层，
    // 此处再解一层，使返回结构匹配 MeResult。
    let data = (res?.data ?? res) as unknown;
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      data = (data as Record<string, unknown>).data;
    }
    return data as MeResult;
  }
}

/** 默认导出的单例工厂 */
export function createAuthClient(config: Omit<ApiClientOptions, 'basePath'>): AuthClient {
  return new AuthClient(config);
}
