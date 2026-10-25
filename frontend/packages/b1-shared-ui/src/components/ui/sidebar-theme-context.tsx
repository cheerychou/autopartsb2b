import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { SidebarTheme, SidebarThemeName } from "./sidebar-theme";
import { sidebarThemes } from "./sidebar-theme";

interface SidebarThemeContextValue {
  theme: SidebarTheme;
  themeName: SidebarThemeName;
  setTheme: (theme: SidebarThemeName | SidebarTheme) => void;
  setThemeName: (themeName: SidebarThemeName) => void;
}

const SidebarThemeContext = createContext<SidebarThemeContextValue | undefined>(undefined);

export interface SidebarThemeProviderProps {
  children: ReactNode;
  defaultTheme?: SidebarThemeName;
  theme?: SidebarTheme;
  onThemeChange?: (theme: SidebarTheme) => void;
}

export function SidebarThemeProvider({
  children,
  defaultTheme = "default",
  theme: customTheme,
  onThemeChange,
}: SidebarThemeProviderProps) {
  const [themeName, setThemeNameState] = useState<SidebarThemeName>(defaultTheme);

  const setTheme = useCallback(
    (newTheme: SidebarThemeName | SidebarTheme) => {
      if (typeof newTheme === "string") {
        setThemeNameState(newTheme);
        onThemeChange?.(sidebarThemes[newTheme]);
      } else {
        onThemeChange?.(newTheme);
      }
    },
    [onThemeChange]
  );

  const setThemeName = useCallback(
    (newThemeName: SidebarThemeName) => {
      setThemeNameState(newThemeName);
      onThemeChange?.(sidebarThemes[newThemeName]);
    },
    [onThemeChange]
  );

  const currentTheme = customTheme || sidebarThemes[themeName];

  const value: SidebarThemeContextValue = {
    theme: currentTheme,
    themeName,
    setTheme,
    setThemeName,
  };

  return (
    <SidebarThemeContext.Provider value={value}>
      {children}
    </SidebarThemeContext.Provider>
  );
}

export function useSidebarTheme(): SidebarThemeContextValue {
  const context = useContext(SidebarThemeContext);
  if (!context) {
    throw new Error("useSidebarTheme must be used within a SidebarThemeProvider");
  }
  return context;
}
