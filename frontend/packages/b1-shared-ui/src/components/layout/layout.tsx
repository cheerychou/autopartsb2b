import * as React from 'react';
import { cn } from "cn";

export interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  hasSider?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const LayoutContext = React.createContext<{
  hasSider: boolean;
}>({
  hasSider: false,
});

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ hasSider, className, style, children, ...props }, ref) => {
    const [siderCount, setSiderCount] = React.useState(0);

    const contextValue = React.useMemo(
      () => ({
        hasSider: hasSider || siderCount > 0,
      }),
      [hasSider, siderCount]
    );

    const childrenArray = React.Children.toArray(children);
    const hasSiderInChildren = childrenArray.some(
      (child) => React.isValidElement(child) && child.type === Sider
    );

    React.useEffect(() => {
      if (hasSiderInChildren) {
        setSiderCount(1);
      }
    }, [hasSiderInChildren]);

    return (
      <LayoutContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            'flex min-h-screen flex-col',
            hasSider && 'flex-row',
            className
          )}
          style={style}
          {...props}
        >
          {children}
        </div>
      </LayoutContext.Provider>
    );
  }
);

Layout.displayName = 'Layout';

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  style?: React.CSSProperties;
  height?: number | string;
  fixed?: boolean;
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, style, height = 64, fixed = false, children, ...props }, ref) => {
    const headerStyle: React.CSSProperties = {
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
      ...(fixed && {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }),
    };

    return (
      <header
        ref={ref}
        className={cn(
          'flex items-center bg-background border-b px-6',
          fixed && 'shadow-sm',
          className
        )}
        style={headerStyle}
        {...props}
      >
        {children}
      </header>
    );
  }
);

Header.displayName = 'Header';

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  style?: React.CSSProperties;
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, style, children, ...props }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          'mt-auto border-t bg-background p-4 text-center text-sm text-muted-foreground',
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </footer>
    );
  }
);

Footer.displayName = 'Footer';

export interface SiderProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  collapsedWidth?: number;
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
  trigger?: React.ReactNode;
}

const Sider = React.forwardRef<HTMLDivElement, SiderProps>(
  ({
    width = 200,
    collapsible = false,
    collapsed = false,
    onCollapse,
    collapsedWidth = 64,
    breakpoint,
    theme = 'dark',
    className,
    style,
    trigger,
    children,
    ...props
  }, ref) => {
    const [internalCollapsed, setInternalCollapsed] = React.useState(collapsed);

    const isCollapsed = collapsible ? internalCollapsed : collapsed;

    React.useEffect(() => {
      setInternalCollapsed(collapsed);
    }, [collapsed]);

    React.useEffect(() => {
      const handleResize = () => {
        if (breakpoint) {
          const breakpointMap: Record<string, number> = {
            xs: 480,
            sm: 576,
            md: 768,
            lg: 992,
            xl: 1200,
            xxl: 1600,
          };
          setInternalCollapsed(window.innerWidth < breakpointMap[breakpoint]);
        }
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    const handleCollapse = () => {
      const newCollapsed = !isCollapsed;
      setInternalCollapsed(newCollapsed);
      onCollapse?.(newCollapsed);
    };

    const siderStyle: React.CSSProperties = {
      width: isCollapsed ? `${collapsedWidth}px` : typeof width === 'number' ? `${width}px` : width,
      minWidth: isCollapsed ? `${collapsedWidth}px` : typeof width === 'number' ? `${width}px` : width,
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#ffffff' : '#000000',
      ...style,
    };

    return (
      <aside
        ref={ref}
        className={cn(
          'flex flex-col border-r transition-all duration-slow',
          className
        )}
        style={siderStyle}
        {...props}
      >
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        {collapsible && trigger && (
          <div
            className="flex h-12 cursor-pointer items-center justify-center border-t hover:bg-muted/50"
            onClick={handleCollapse}
          >
            {trigger}
          </div>
        )}
      </aside>
    );
  }
);

Sider.displayName = 'Sider';

export interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  style?: React.CSSProperties;
}

const Content = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ className, style, children, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn('flex-1 overflow-auto p-6', className)}
        style={style}
        {...props}
      >
        {children}
      </main>
    );
  }
);

Content.displayName = 'Content';

export { Layout, Header, Footer, Sider, Content };
