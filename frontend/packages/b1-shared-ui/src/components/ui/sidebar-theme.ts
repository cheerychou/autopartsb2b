export interface SidebarThemeColors {
  bg: string;
  text: string;
  border: string;
  accent: string;
  accentForeground: string;
  hover: string;
  hoverText: string;
  active: string;
  activeText: string;
  icon: string;
  iconActive: string;
  iconDark: string;
  iconDarkActive: string;
  badgeDefault: string;
  badgeDefaultText: string;
  badgeDestructive: string;
  badgeDestructiveText: string;
  badgeOutline: string;
  badgeOutlineText: string;
  focusRing: string;
  focusRingOffset: string;
}

export interface SidebarThemeSizes {
  width: string;
  widthCollapsed: string;
  itemHeight: string;
  itemPadding: string;
  itemPaddingCollapsed: string;
  iconSize: string;
  badgePadding: string;
  childIndent: string;
}

export interface SidebarTheme {
  name: string;
  colors: SidebarThemeColors;
  sizes: SidebarThemeSizes;
  transitions: {
    duration: string;
    easing: string;
  };
}

export const defaultSidebarTheme: SidebarTheme = {
  name: "default",
  colors: {
    bg: "hsl(var(--background))",
    text: "hsl(var(--muted-foreground))",
    border: "hsl(var(--border))",
    accent: "hsl(var(--accent))",
    accentForeground: "hsl(var(--accent-foreground))",
    hover: "hsl(var(--accent))",
    hoverText: "hsl(var(--accent-foreground))",
    active: "hsl(var(--accent))",
    activeText: "hsl(var(--accent-foreground))",
    icon: "rgb(156 163 175)",
    iconActive: "hsl(var(--accent-foreground))",
    iconDark: "rgb(107 114 128)",
    iconDarkActive: "hsl(var(--accent-foreground))",
    badgeDefault: "hsl(var(--primary))",
    badgeDefaultText: "hsl(var(--primary-foreground))",
    badgeDestructive: "hsl(var(--destructive))",
    badgeDestructiveText: "hsl(var(--destructive-foreground))",
    badgeOutline: "transparent",
    badgeOutlineText: "hsl(var(--foreground))",
    focusRing: "hsl(var(--ring))",
    focusRingOffset: "hsl(var(--background))",
  },
  sizes: {
    width: "13rem",
    widthCollapsed: "4rem",
    itemHeight: "2.5rem",
    itemPadding: "0.75rem",
    itemPaddingCollapsed: "0",
    iconSize: "1rem",
    badgePadding: "0.25rem 0.5rem",
    childIndent: "1rem",
  },
  transitions: {
    duration: "300ms",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

export const sidebarThemes = {
  default: defaultSidebarTheme,
} as const;

export type SidebarThemeName = keyof typeof sidebarThemes;

export function mergeSidebarTheme(
  base: SidebarTheme,
  overrides?: Partial<SidebarTheme>
): SidebarTheme {
  if (!overrides) return base;

  return {
    ...base,
    colors: { ...base.colors, ...overrides.colors },
    sizes: { ...base.sizes, ...overrides.sizes },
    transitions: { ...base.transitions, ...overrides.transitions },
  };
}
