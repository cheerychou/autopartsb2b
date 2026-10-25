import { SpinnerGap } from "@phosphor-icons/react";

import { cn } from "cn"

/** 语义尺寸（对齐 Tag/EmptyState 的 sm/md/lg 惯例，映射 Tailwind size 类） */
export type SpinnerSemanticSize = "sm" | "md" | "lg"

const SEMANTIC_SIZE_CLASSES: Record<SpinnerSemanticSize, string> = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-7",
}

export interface SpinnerProps extends Omit<React.ComponentProps<"svg">, 'ref'> {
  label?: string;
  /** 图标尺寸：像素数/CSS 长度字符串映射到 width/height；语义 token（sm/md/lg）映射 Tailwind size 类 */
  size?: number | string;
}

/**
 * Spinner 组件 - 用于按钮内的加载指示器
 * 配合 Button 使用时，添加 data-icon="inline-start" 属性可获得正确的间距
 */
function Spinner({ className, label, size, ...props }: SpinnerProps) {
  // 语义 token 不能直接进 svg width/height（非法长度值，浏览器报
  // `Expected length, "md"`），映射为 Tailwind size 类（对齐 Tag/EmptyState 惯例）
  const semantic = typeof size === "string" && size in SEMANTIC_SIZE_CLASSES
    ? (size as SpinnerSemanticSize)
    : undefined;
  const lengthSize = semantic ? undefined : size;
  return (
    <SpinnerGap
      role="status"
      aria-label={label || "Loading"}
      className={cn("size-4 animate-spin", semantic && SEMANTIC_SIZE_CLASSES[semantic], className)}
      {...(lengthSize != null ? { width: lengthSize, height: lengthSize } : {})}
      {...props}
    />
  )
}

export { Spinner }
