import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export interface PermissionGuardProps {
  /** 应用侧算好的访问判定结果（shared-ui 不接应用 store，依赖注入） */
  allowed: boolean;
  children: ReactNode;
  /** 逃生口：提供时缺权直接渲染它，不跳转不 toast */
  fallback?: ReactNode;
  /** 缺权跳转目标，默认受限页 */
  redirectTo?: string;
  /** 缺权一次性 toast 文案；传 null 禁用 toast */
  toastMessage?: string | null;
}

/**
 * 权限守卫（ADT-ALL-004 §5.3，2026-10-11 §4.4-3 拍板口径落地）：
 * 缺权 → 跳受限页 + 一次性 toast 说明；fallback prop 保留逃生口。
 *
 * 行为统一自 store-web RequireRoles（38 处挂载的真基座）：
 * 原 RequireRoles 静默跳 /biz/403 无提示，本组件补一次性 toast；
 * 依赖注入 allowed——应用侧薄壳绑定各自 auth store（store-web）或
 * 页内降级 UI 走 fallback（platform-web ProtectedRoute 语义）。
 */
export function PermissionGuard({
  allowed,
  children,
  fallback,
  redirectTo = '/biz/403',
  toastMessage = '权限不足，已跳转至受限页面',
}: PermissionGuardProps) {
  const location = useLocation();

  const denied = !allowed && !fallback;
  useEffect(() => {
    if (denied && toastMessage) {
      toast.error(toastMessage);
    }
    // 挂载期触发一次；denied 状态翻转（权限异步就绪）后再次拒绝时提示一次
  }, [denied, toastMessage]);

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
