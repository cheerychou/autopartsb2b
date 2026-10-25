import * as React from "react"
import { cn } from "cn"
import { WarningCircle, SealCheck } from "@phosphor-icons/react";

export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string
  success?: string
  warning?: string
}

/**
 * 表单校验消息组件
 * 带有平滑的入场/退场过渡动画
 */
export function FormMessage({ 
  className, 
  error, 
  success,
  warning,
  children,
  ...props 
}: FormMessageProps) {
  if (!error && !success && !warning && !children) {
    return null
  }

  const message = error || success || warning || children
  const type = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default'

  const iconMap = {
    error: <WarningCircle className="h-4 w-4" />,
    success: <SealCheck className="h-4 w-4" />,
    warning: <WarningCircle className="h-4 w-4" />,
    default: null
  }

  const colorMap = {
    error: 'text-destructive',
    success: 'text-success',
    warning: 'text-warning',
    default: 'text-muted-foreground'
  }

  return (
    <p
      className={cn(
        "text-sm flex items-center gap-1.5",
        "animate-in fade-in-0 slide-in-from-top-1 duration-normal",
        colorMap[type],
        className
      )}
      {...props}
    >
      {iconMap[type]}
      {message}
    </p>
  )
}
