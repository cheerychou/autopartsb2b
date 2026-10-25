import * as React from "react"
import { cn } from "cn"
import type { IconComponent } from "../../types"

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  icon?: IconComponent
  /** 右侧操作区（如「批量添加」按钮） */
  action?: React.ReactNode
  /** 1 = 单列（无响应式升级，字段/开关行通栏纵排）；2/3/4 = 响应式字段网格 */
  columns?: 1 | 2 | 3 | 4
}

/**
 * 表单分组区块（react-hook-form 兼容版）
 *
 * - 不做 cloneElement 注入 mode/readOnlyFields，直接渲染 children；
 * - 字段的只读/禁用由 FormField 的 disabled prop 或子组件自身控制；
 * - 通过 useFormContext 与 <Form> 协同，无需感知 mode；
 * - 无卡片形态（2026-09-30 拍板）：分组不再各自包边框，非首个分组顶部
 *   border-t 做区隔（与 FormFooter 自带的 border-t 同节奏，无双线）。
 *   依赖父容器为纵向堆叠（Form 的 space-y-form / flex flex-col gap-*），
 *   勿将 FormSection 并排放进 grid——顶部区隔线会按列断开。
 */
export function FormSection({
  title,
  icon: Icon,
  action,
  columns = 4,
  children,
  className,
  ...props
}: FormSectionProps) {
  // 响应式网格：移动端 1 列 → sm 中间断点 → md/lg 目标列数；1 列不做响应式升级
  const gridCols: Record<NonNullable<FormSectionProps['columns']>, string> = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 md:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    // pt-5：线到标题的呼吸间距；线上方留白由父容器间距（24px/16px）承担
    <div
      className={cn('flex flex-col pt-5 gap-3 min-w-0 [&:not(:first-child)]:border-t', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base font-medium flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h2>
        {action}
      </div>
      <div className={cn('grid grid-cols-1 gap-4 text-sm min-w-0', gridCols[columns])}>
        {children}
      </div>
    </div>
  )
}
