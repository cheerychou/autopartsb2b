/**
 * Button 组件
 *
 * 一个灵活的按钮组件，支持多种变体和尺寸，遵循 ShadCN UI 设计系统规范。
 *
 * @example
 * // 基本使用
 * <Button>点击这里</Button>
 *
 * @example
 * // 使用不同变体
 * <Button variant="default">默认按钮</Button>
 * <Button variant="secondary">次要按钮</Button>
 * <Button variant="destructive">危险按钮</Button>
 * <Button variant="outline">轮廓按钮</Button>
 * <Button variant="ghost">幽灵按钮</Button>
 * <Button variant="link">链接按钮</Button>
 *
 * @example
 * // 使用不同尺寸
 * <Button>默认尺寸（32px）</Button>
 * <Button size="md">中等尺寸（36px）</Button>
 * <Button size="lg">大尺寸（40px）</Button>
 * <Button size="xs">极小尺寸（24px）</Button>
 *
 * @example
 * // 作为链接使用：组合需求请直接用 buttonVariants 应用到 a/Link 上（Base UI 底座无 Slot）
 * <a href="#" className={buttonVariants({ variant: "outline" })}>链接按钮</a>
 *
 * @param {
 *   className?: string; // 自定义类名
 *   variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"; // 按钮变体
 *   size?: "default" | "sm" | "lg" | "icon"; // 按钮尺寸
 * } props - 按钮组件的属性
 * @returns {JSX.Element} - 渲染的按钮元素
 */
import * as React from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "cn"
import { buttonVariants } from './variants/ButtonVariants'

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
