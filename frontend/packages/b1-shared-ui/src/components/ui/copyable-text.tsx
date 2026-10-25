import { useState } from "react";
import { Copy } from "@phosphor-icons/react";
import { cn } from "cn";

export type MaskType = 'phone' | 'vin' | 'plate';

export interface CopyableTextProps {
  text: string;
  disabled?: boolean;
  masked?: boolean;
  maskType?: MaskType;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  size?: 'sm' | 'md';
  onCopied?: (value: string) => void;
}

/**
 * 可复制文本组件
 * 支持悬停显示复制图标和临时反馈
 * 支持禁用状态和脱敏显示
 * @param text - 要渲染和复制的文本
 * @param disabled - 禁用复制交互
 * @param masked - 是否脱敏显示
 * @param maskType - 脱敏类型
 * @param className - 容器类名
 * @param textClassName - 文本类名
 * @param iconClassName - 图标类名
 * @param size - 图标尺寸
 * @param onCopied - 复制后回调
 */
export function CopyableText({
  text,
  disabled,
  masked,
  maskType,
  className,
  textClassName,
  iconClassName,
  size = 'md',
  onCopied,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const mask = (s: string): string => {
    if (!masked) return s;
    const val = String(s ?? '');
    if (maskType === 'phone') {
      return val.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    if (maskType === 'vin') {
      const clean = val.replace(/[^A-Za-z0-9]/g, '');
      const final = (clean || '').padEnd(17, '0').slice(0, 17);
      return final.replace(/(.{4}).{9}(.{4})/, '$1*********$2');
    }
    if (maskType === 'plate') {
      return val.replace(/(.{2}).+(.{2})/, '$1***$2');
    }
    return val;
  };

  const iconSize = size === 'sm' ? 14 : 16;

  const doCopy = () => {
    if (disabled) return;
    try {
      const nav = (globalThis as unknown as { navigator?: Navigator }).navigator;
      if (nav?.clipboard?.writeText) {
        void nav.clipboard.writeText(text);
      }
    } catch {
      void 0;
    }
    setCopied(true);
    onCopied?.(text);
    setTimeout(() => setCopied(false), 1500);
  };

  const textCls = [textClassName, copied ? 'bg-text-mark text-foreground rounded' : ''].filter(Boolean).join(' ');

  return (
    <span className={cn("group inline-flex items-center gap-2 rounded px-0 py-0.5 transition-colors hover:bg-text-mark whitespace-nowrap bg-transparent relative", className)}>
      {textCls ? <span className={textCls}>{mask(text)}</span> : mask(text)}
      {!disabled && !copied && (
        <Copy
          className={cn("text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity", iconClassName)}
          style={{ width: iconSize, height: iconSize }}
          onClick={doCopy}
        />
      )}
      {copied && (
        <span className="absolute -right-[2.25rem] top-1/2 -translate-y-1/2 text-xs rounded px-1 bg-text-mark text-text-mark-foreground">
          已复制
        </span>
      )}
    </span>
  );
}
