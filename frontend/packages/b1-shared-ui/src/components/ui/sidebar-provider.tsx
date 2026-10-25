import type { ReactNode } from "react";
import { RouteAdapterProvider } from "./sidebar-route-adapter-context";
import { SidebarThemeProvider } from "./sidebar-theme-context";
import { ReactRouterAdapter } from "./sidebar-react-router-adapter";
import type { RouteAdapter } from "./sidebar-route-adapter";
import type { SidebarThemeName, SidebarTheme } from "./sidebar-theme";

export interface SidebarContextProviderProps {
  children: ReactNode;
  adapter?: RouteAdapter;
  defaultTheme?: SidebarThemeName;
  theme?: SidebarTheme;
  onThemeChange?: (theme: SidebarTheme) => void;
}

/**
 * 侧边栏上下文统一 Provider
 *
 * 合并 RouteAdapterProvider + SidebarThemeProvider，
 * 使用方只需包裹一次即可获得路由适配和主题支持。
 * 默认使用 ReactRouterAdapter，无需手动传入。
 */
export function SidebarContextProvider({
  children,
  adapter = ReactRouterAdapter,
  defaultTheme,
  theme,
  onThemeChange,
}: SidebarContextProviderProps) {
  return (
    <RouteAdapterProvider adapter={adapter}>
      <SidebarThemeProvider
        defaultTheme={defaultTheme}
        theme={theme}
        onThemeChange={onThemeChange}
      >
        {children}
      </SidebarThemeProvider>
    </RouteAdapterProvider>
  );
}
