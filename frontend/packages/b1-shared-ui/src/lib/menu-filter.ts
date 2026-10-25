import type { IMenuItem } from '../components/ui/sidebar-menu';

/**
 * 带门控字段的菜单项（IMenuItem 的扩展）。
 *
 * - requiredFeature：订阅特性门控，仅订阅了该特性的租户可见（store-web 使用）
 * - requiredPermission：权限码门控，仅拥有该权限的用户可见。
 *   支持 'permission1|permission2' 格式表示任一匹配即通过。
 * - requiredRoles：角色门控（端归属），仅拥有任一角色的用户可见。
 *   角色闸独立于权限码，'*' 通配权限不影响角色判断——
 *   用于"总部管理"等按端隔离的菜单（G5/N5/N7 单店版一律不可见）。
 */
export interface IMenuItemWithFeature extends IMenuItem {
  requiredFeature?: string;
  requiredPermission?: string;
  requiredRoles?: string[];
  children?: IMenuItemWithFeature[];
}

/**
 * 根据订阅特性递归过滤菜单项。
 *
 * - 未声明 requiredFeature 的菜单项始终保留
 * - 声明了 requiredFeature 的菜单项仅当 features[feature] 为真时保留
 * - 父级菜单过滤后若无子项则自动隐藏
 */
export function filterMenuByFeatures(
  items: IMenuItemWithFeature[],
  features: Record<string, boolean>,
): IMenuItemWithFeature[] {
  return items
    .filter((item) => {
      if (item.requiredFeature && !features[item.requiredFeature]) return false;
      return true;
    })
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByFeatures(item.children, features);
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter((item) => {
      if (item.children !== undefined && item.children.length === 0) return false;
      return true;
    });
}

/**
 * 根据用户权限递归过滤菜单项。
 *
 * - 未声明 requiredPermission 的菜单项始终保留
 * - 声明了 requiredPermission 的菜单项仅当用户拥有该权限时保留
 * - requiredPermission 支持 '|' 分隔的多个权限，任一匹配即通过
 * - 拥有通配权限 '*' 的用户（超管）直接放行所有菜单
 * - 父级菜单过滤后若无子项则自动隐藏
 */
export function filterMenuByPermissions(
  items: IMenuItemWithFeature[],
  userPermissions: string[],
): IMenuItemWithFeature[] {
  const hasWildcard = userPermissions.includes('*');

  return items
    .filter((item) => {
      if (!item.requiredPermission) return true;
      if (hasWildcard) return true;
      const required = item.requiredPermission.split('|');
      return required.some((p) => userPermissions.includes(p.trim()));
    })
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByPermissions(item.children, userPermissions);
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter((item) => {
      if (item.children !== undefined && item.children.length === 0) return false;
      return true;
    });
}

/**
 * 根据用户角色递归过滤菜单项（端归属门控）。
 *
 * - 未声明 requiredRoles 的菜单项始终保留
 * - 声明了 requiredRoles 的菜单项仅当用户拥有任一角色时保留
 * - 角色闸独立于权限码：'*' 通配权限不参与角色判断，
 *   防止持有通配权限的门店角色（如 store_admin）越端看到总部菜单
 * - 父级菜单过滤后若无子项则自动隐藏
 */
export function filterMenuByRoles(
  items: IMenuItemWithFeature[],
  userRoles: string[],
): IMenuItemWithFeature[] {
  return items
    .filter((item) => {
      if (!item.requiredRoles) return true;
      return item.requiredRoles.some((r) => userRoles.includes(r));
    })
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByRoles(item.children, userRoles);
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter((item) => {
      if (item.children !== undefined && item.children.length === 0) return false;
      return true;
    });
}
