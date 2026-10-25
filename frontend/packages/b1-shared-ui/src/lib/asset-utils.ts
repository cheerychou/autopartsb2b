/**
 * 资源路径工具模块
 * 统一处理 Vite BASE_URL 与资源路径的拼接
 */

/**
 * 获取当前 Vite 应用的基础路径
 * 确保以 / 结尾
 */
function getBaseURL(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * 获取资源的完整路径
 * 自动处理 BASE_URL 前缀，适配子路径部署
 * @param assetPath 资源相对路径，如 "images/brand/logo.svg"
 * @returns 完整的资源路径
 */
export function getAssetPath(assetPath: string): string {
  if (!assetPath) return getBaseURL();
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${getBaseURL()}${cleanPath}`;
}
