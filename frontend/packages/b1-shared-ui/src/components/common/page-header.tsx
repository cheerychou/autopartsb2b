import * as React from "react"
import { cn } from "cn"
import { SimpleBreadcrumb } from "../ui/breadcrumb"
import { Icons } from "../ui/icons"

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  /** 实体身份元信息（单号/编码/状态），与标题同行渲染；禁功能说明句，准入规则见 PAGE_HEADER_USAGE.md */
  subtitle?: string
  /** 页面说明，同行左右结构（标题在前、说明在后、底部对齐、间隔 32px）；写法准入规则见 PAGE_HEADER_USAGE.md */
  description?: string
  /** 面包屑项，渲染在标题行上方 */
  breadcrumbItems?: Array<{ label: string; href?: string }>
  /** 返回按钮回调，传入时在标题左侧渲染返回箭头 */
  onBack?: () => void
  action?: React.ReactNode
}

/**
 * 统一的页头组件（唯一真源，platform-web 本地副本已废弃）
 * 标题与 subtitle/description 同行左右结构（底部对齐、间隔 32px），右侧操作区。
 * 规范文档：packages/shared-ui/PAGE_HEADER_USAGE.md
 * 存量裁决清单：frontend/docs/page-header-description-audit.md
 */
export function PageHeader({
  title,
  subtitle,
  description,
  breadcrumbItems,
  onBack,
  action,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {breadcrumbItems && breadcrumbItems.length > 0 && (
        <SimpleBreadcrumb items={breadcrumbItems} />
      )}
      <div className="flex items-center justify-between gap-4">
        {/* 文字底部对齐用基线对齐（items-baseline）：标题 text-xl 与说明 text-sm 字号不同，盒底对齐会视觉错位 */}
        <div className="flex items-baseline gap-8 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="返回"
              className="shrink-0 self-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Icons.ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-semibold shrink-0">{title}</h1>
          {subtitle && (
            <span className="text-sm text-muted-foreground truncate">{subtitle}</span>
          )}
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2 shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
