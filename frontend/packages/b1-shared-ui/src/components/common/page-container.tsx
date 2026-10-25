import * as React from "react"
import { cn } from "cn"

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  breadcrumb?: React.ReactNode
}

/**
 * 统一的页面容器组件
 * 负责处理统一的间距和布局方向
 * padding 由布局层（Layout main）统一提供，此组件不再重复设置
 *
 * 纵向节奏唯一来源是 gap-section（--spacing-section-gap，紧凑模式自动收窄）。
 * 直接子元素的 margin-bottom 一律中和：区块间距只由 gap 提供，
 * 子元素再写 mb-* 不生效（历史上 mb-4 与 gap 叠加出双倍间距的缺陷在此焊死）。
 */
export function PageContainer({ children, className, breadcrumb, ...props }: PageContainerProps) {
  return (
    <div
      className={cn("flex flex-col gap-section [&>*]:mb-0!", className)}
      {...props}
    >
      {breadcrumb}
      {children}
    </div>
  )
}
