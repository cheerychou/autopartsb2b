import { cn } from "cn";
import { useEffect, useMemo, useState } from "react";

export interface BrandLogoProps {
  isCollapsed?: boolean;
  className?: string;
  src?: string;
}

export function BrandLogo({
  isCollapsed = false,
  className,
}: BrandLogoProps) {
  const [useExternal, setUseExternal] = useState(true);
  // lazy initializer：优先读 localStorage（与 ThemeToggle 一致），
  // 回退到 DOM class，再回退到系统偏好。
  // 解决刷新时 ThemeToggle useEffect 尚未执行、DOM class 未就绪的时序问题。
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) return saved === 'dark';
    if (document.documentElement.classList.contains('dark')) return true;
    // jsdom 等无 matchMedia 环境安全兜底
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    // 仅监听 MutationObserver，不在 effect 中 setState
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const effectiveSrc = useMemo(() => {
    const base = (import.meta.env as { BASE_URL?: string }).BASE_URL?.endsWith('/')
      ? (import.meta.env as { BASE_URL?: string }).BASE_URL
      : `${(import.meta.env as { BASE_URL?: string }).BASE_URL || ''}/`;

    if (isCollapsed) return `${base}logo_icon.svg`;
    return isDark ? `${base}logo_black_background.svg` : `${base}logo_white_background.svg`;
  }, [isCollapsed, isDark]);

  const svgContent = `
    <svg width="${isCollapsed ? '20' : '144'}" ${isCollapsed ? 'height="20"' : ''} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="currentColor" fill-opacity="0.1"/>
      <path d="M12 10C12 8.89543 12.8954 8 14 8H18C19.1046 8 20 8.89543 20 10V12C20 13.1046 19.1046 14 18 14H14C12.8954 14 12 13.1046 12 12V10Z" fill="currentColor" fill-opacity="0.8"/>
      <path d="M22 10C22 8.89543 22.8954 8 24 8H26C27.1046 8 28 8.89543 28 10V12C28 13.1046 27.1046 14 26 14H24C22.8954 14 22 13.1046 22 12V10Z" fill="currentColor" fill-opacity="0.6"/>
      <path d="M12 18C12 16.8954 12.8954 16 14 16H18C19.1046 16 20 16.8954 20 18V20C20 21.1046 19.1046 22 18 22H14C12.8954 22 12 21.1046 12 20V18Z" fill="currentColor" fill-opacity="0.4"/>
    </svg>
  `;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg transition-all duration-normal',
        className
      )}
    >
      {useExternal ? (
        <img
          key={effectiveSrc}
          src={effectiveSrc}
          alt="CDD品牌Logo"
          width={isCollapsed ? 20 : 144}
          style={{ height: 'auto', display: 'block' }}
          onError={() => setUseExternal(false)}
        />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: svgContent }} />
      )}
    </div>
  );
}
