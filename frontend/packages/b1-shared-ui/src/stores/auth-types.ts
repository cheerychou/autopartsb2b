/**
 * 共享认证类型定义和工具函数
 *
 * 所有前端应用（store-web / platform-web / data-platform-web / store-mobile-app）
 * 共用此模块的认证类型定义，确保 User、Permissions 等接口一致。
 *
 * 各应用保留各自的 authStore 实现（业务差异），但共享此处的类型和工具函数。
 */

/** 用户角色编码 — 与后端 RBAC v2.0 的 23 个预置角色对齐（EA-SEC-007 §4.1）
 *  含 `| string` 以兼容门店自定义角色码（custom_ 前缀，§4.4） */
export type UserRole =
  // 管理层
  | 'store_admin' | 'store_manager' | 'investor' | 'viewer'
  // 服务接待
  | 'frontdesk'
  // 车间管理
  | 'workshop_supervisor' | 'dispatcher' | 'inspector'
  // 车间工种路由角色（角色码门控，派工匹配，§4.3）
  | 'me_technician' | 'panel_technician' | 'paint_technician' | 'wash_technician' | 'detailing_technician'
  // 供应链
  | 'warehouse' | 'purchaser'
  // 业务支撑
  | 'finance' | 'cashier' | 'marketing_specialist' | 'hr_manager'
  // 平台
  | 'platform_admin' | 'platform_support'
  // 连锁
  | 'chain_admin' | 'chain_hq_purchaser'
  | string;

/** 标准用户接口 — 所有应用的 User 类型应兼容此接口 */
export interface BaseUser {
  id: string;
  username?: string;
  name: string;
  email?: string;
  phone?: string;
  /** 主角色（显示用，取多角色的第一个）；角色判断请用 roles 数组 */
  role: UserRole | string;
  /** 角色码数组（多角色并集，权威判断字段，EA-SEC-007 §4.2） */
  roles?: string[];
  permissions: string[];
  tenantId?: string;
  tenantName?: string;
  isActive?: boolean;
}

/** 登录凭证 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** 订阅特性集 */
export interface SubscriptionFeatures {
  features: Record<string, boolean>;
  storeId?: string;
}

/** 认证状态基础接口 — 各应用 authStore 应至少包含这些字段 */
export interface BaseAuthState {
  user: BaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * 检查用户是否有指定权限
 *
 * @param user - 用户对象
 * @param permission - 权限编码（如 "orders:write"）
 * @returns 是否有权限
 */
export function checkPermission(
  user: BaseUser | null,
  permission: string
): boolean {
  if (!user) return false;
  if (user.permissions.includes('*')) return true;
  return user.permissions.includes(permission);
}

/**
 * 检查用户是否有任一权限
 *
 * @param user - 用户对象
 * @param permissions - 权限编码数组
 * @returns 是否有任一权限
 */
export function checkAnyPermission(
  user: BaseUser | null,
  permissions: string[]
): boolean {
  if (!user) return false;
  if (user.permissions.includes('*')) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

/**
 * 检查用户是否有指定角色
 *
 * @param user - 用户对象
 * @param role - 角色编码
 * @returns 是否有角色
 */
export function checkRole(user: BaseUser | null, role: string): boolean {
  if (!user) return false;
  const roles = user.roles ?? (user.role ? [user.role] : []);
  return roles.includes(role);
}

/**
 * 检查用户是否有任一角色
 *
 * @param user - 用户对象
 * @param roles - 角色编码数组
 * @returns 是否有任一角色
 */
export function checkAnyRole(user: BaseUser | null, roles: string[]): boolean {
  if (!user) return false;
  const userRoles = user.roles ?? (user.role ? [user.role] : []);
  return roles.some((r) => userRoles.includes(r));
}

/**
 * 从 AuthClient 登录结果中提取标准用户信息
 *
 * 各应用的 authStore.login 可调用此函数统一映射用户数据，
 * 减少各应用中的重复映射逻辑。
 *
 * @param authResult - AuthClient.login() 返回的结果
 * @param options - 可选的角色默认值和权限映射
 * @returns 标准化的 BaseUser 对象
 */
export function mapAuthResultToUser(
  authResult: {
    user: {
      id: string;
      name: string;
      tenantId?: string;
      phone?: string;
      roles?: Array<{ code: string }>;
    };
    tenant?: { name: string };
  },
  options?: {
    defaultRole?: string;
    mapPermissions?: (roles: string[]) => string[];
  }
): BaseUser {
  const roles = authResult.user.roles || [];
  const roleCodes = roles.map((r) => (typeof r === 'string' ? r : r.code));
  const primaryRole = roleCodes[0] || options?.defaultRole || 'viewer';

  const permissions = options?.mapPermissions
    ? options.mapPermissions(roleCodes)
    : roleCodes.includes('store_admin')
      ? ['*']
      : [];

  return {
    id: authResult.user.id,
    name: authResult.user.name,
    phone: authResult.user.phone,
    role: primaryRole,
    roles: roleCodes,
    permissions,
    tenantId: authResult.user.tenantId,
    tenantName: authResult.tenant?.name,
    isActive: true,
  };
}
