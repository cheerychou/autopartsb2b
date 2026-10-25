import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { LayoutGroup, motion } from "motion/react";
import { Badge } from "./badge";
import { cn } from "cn";
import type { SidebarTheme } from "./sidebar-theme";
import { useRouteAdapter } from "./sidebar-route-adapter-context";

export interface IMenuItem {
  id: string;
  label: string;
  href?: string;
  icon?: any;
  children?: IMenuItem[];
  active?: boolean;
  disabled?: boolean;
  badge?: {
    count: number;
    variant?: "default" | "destructive" | "outline";
  };
  permission?: string[];
  requiredPermission?: string;
}

export interface ISidebarMenuProps {
  items: IMenuItem[];
  collapsed?: boolean;
  onItemClick?: (item: IMenuItem) => void;
  userRole?: string;
  enablePermissionFilter?: boolean;
  className?: string;
  theme?: SidebarTheme;
}

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveIcon(icon: IMenuItem["icon"], active: boolean) {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon as React.ReactElement<Record<string, unknown>>, {
      size: 18,
      className: active ? "text-sidebar-accent-foreground" : "text-muted-foreground dark:text-muted-foreground",
    });
  }
  const IconComp = icon as React.ElementType<Record<string, unknown>>;
  return (
    <IconComp
      size={16}
      className={active ? "text-sidebar-accent-foreground" : "text-muted-foreground dark:text-muted-foreground"}
    />
  );
}

export const SidebarMenu: React.FC<ISidebarMenuProps> = ({
  items,
  collapsed = false,
  onItemClick,
  userRole,
  enablePermissionFilter = false,
  className,
}) => {
  const { useLocation } = useRouteAdapter();
  const location = useLocation();

  const defaultExpanded = useMemo(() => {
    const expanded = new Set<string>();
    const visit = (list: IMenuItem[]) => {
      list.forEach((item) => {
        if (item.children?.length) {
          const childActive = item.children.some((c) => isActivePath(location.pathname, c.href));
          if (childActive || isActivePath(location.pathname, item.href)) {
            expanded.add(item.id);
          }
          visit(item.children);
        }
      });
    };
    visit(items);
    return expanded;
  }, [items, location.pathname]);

  const [expandedIds, setExpandedIds] = useState<string[]>(() => Array.from(defaultExpanded));

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newIds = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return newIds;
    });
  }, []);

  const filteredItems = useMemo(() => {
    if (!enablePermissionFilter) return items;

    const allow = (it: IMenuItem) => {
      if (!it.permission || it.permission.length === 0) return true;
      return !!userRole && it.permission.includes(userRole);
    };

    const clone: IMenuItem[] = items
      .filter(allow)
      .map((it) => ({
        ...it,
        children: it.children?.filter(allow),
      }));
    return clone;
  }, [items, userRole, enablePermissionFilter]);

  const menuId = React.useId();

  const content = useMemo(
    () => (
      <LayoutGroup id={menuId}>
        <nav
          className={cn("flex flex-col gap-1", className)}
          role="navigation"
          aria-label="侧边栏导航"
        >
          {filteredItems.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              expanded={expandedIds.includes(item.id)}
              onToggle={() => toggleExpanded(item.id)}
              onClick={() => onItemClick?.(item)}
            />
          ))}
        </nav>
      </LayoutGroup>
    ),
    [filteredItems, collapsed, expandedIds, className, onItemClick, toggleExpanded, menuId]
  );

  return content;
};

interface MenuItemProps {
  item: IMenuItem;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}

const MenuItem = function MenuItem({ item, collapsed, expanded, onToggle, onClick }: MenuItemProps) {
  const hasChildren = !!(item.children && item.children.length > 0);
  const disabled = !!item.disabled;
    const { useLocation } = useRouteAdapter();
    const location = useLocation();
    const active = useMemo(() => {
      const path = location.pathname;
      if (hasChildren) {
        return (
          !!item.children?.some((child) => child.href && path.startsWith(child.href)) ||
          (!!item.href && path.startsWith(item.href))
        );
      }
      return !!item.href && path.startsWith(item.href);
    }, [location.pathname, item.href, item.children, hasChildren]);

    const iconEl = useMemo(() => resolveIcon(item.icon, active), [item.icon, active]);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        if (hasChildren) {
          e.preventDefault();
          onToggle();
          return;
        }
        onClick?.();
      },
      [disabled, hasChildren, onToggle, onClick]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (hasChildren) {
            onToggle();
          } else {
            onClick();
          }
        }
      },
      [hasChildren, onToggle, onClick]
    );

    const buttonClassName = cn(
      "relative w-full flex items-center h-10 px-6 text-sm rounded-md transition-colors duration-fast hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      active ? "text-sidebar-accent-foreground font-medium" : "text-muted-foreground",
      disabled ? "opacity-50 cursor-not-allowed" : "",
      collapsed ? "justify-center px-0" : "justify-between"
    );

    const inner = (
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={expanded}
        aria-controls={hasChildren ? `submenu-${item.id}` : undefined}
        aria-disabled={disabled}
        className={buttonClassName}
        type="button"
      >
        {active && !collapsed && (
          <motion.span
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-primary"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        {active && (
          <motion.span
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-md bg-sidebar-accent"
            style={{ zIndex: -1 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          {iconEl}
          {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2">
            {item.badge && (
              <Badge variant={item.badge.variant} className="text-xs">
                {item.badge.count}
              </Badge>
            )}
            {hasChildren && (
              <CaretDown
                weight="bold"
                className={cn(
                  "h-4 w-4 transition-transform duration-slow",
                  expanded ? "rotate-180" : "rotate-0"
                )}
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </button>
    );

    return (
      <div className="w-full">
        {inner}
        <div
          id={hasChildren ? `submenu-${item.id}` : undefined}
          role="menu"
          style={{
            display: hasChildren && expanded && !collapsed ? 'flex' : 'none'
          }}
          className="ml-3 mt-1 flex flex-col gap-1 border-l border-border pl-0"
        >
          {hasChildren &&
            item.children?.map((child) => (
              <ChildItem key={child.id} item={child} onClick={onClick} />
            ))}
        </div>
      </div>
    );
  }

MenuItem.displayName = "MenuItem";

interface ChildItemProps {
  item: IMenuItem;
  onClick: () => void;
}

const ChildItem = React.memo(function ChildItem({ item, onClick }: ChildItemProps) {
  const disabled = !!item.disabled;
  const { useLocation, Link } = useRouteAdapter();
  const location = useLocation();
  const active = !!(item.href && location.pathname.startsWith(item.href));

  return (
    <Link
      to={item.href || "#"}
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center justify-between h-9 pl-13 pr-6 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active ? "text-sidebar-accent-foreground font-semibold" : "text-muted-foreground",
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <motion.span
          layoutId="sidebar-child-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-0.5 rounded-r-full bg-primary"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <Badge variant={item.badge.variant} className="text-xs">
          {item.badge.count}
        </Badge>
      )}
    </Link>
  );
});

ChildItem.displayName = "ChildItem";
