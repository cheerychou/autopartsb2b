import * as React from "react"
import { cn } from "cn"

/** 入口项数据协议（页面侧模块级常量数组；onClick 页面侧接 navigate） */
export interface EntryItem {
  /** 入口标题 */
  title: string
  /** 一句话说明 */
  description?: string
  /** 图标（Icons 语义注册表或 @phosphor-icons/react），渲染为 40px 主色软底方块 */
  icon?: React.ComponentType<{ size?: number | string; className?: string }>
  /** 点击回调（shared-ui 不依赖 router，跳转由页面接 navigate） */
  onClick: () => void
}

export interface EntryGridProps {
  items: EntryItem[]
  /** 桌面列数（md 断点起），默认 2；移动端恒单列 */
  cols?: 2 | 3 | 4
  className?: string
}

const COLS_CLASS: Record<NonNullable<EntryGridProps["cols"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
}

/**
 * 入口卡片网格（概览页模板「快捷操作区」标准件，ENG-FE-DESIGN-004 §3.1）
 *
 * 收编域概览/门户页 6+ 处逐字同构的入口卡：{title, description, icon} + Card onClick。
 * 图标可选：传入渲染 40px 主色软底方块（CouponCenter 形态），不传仅文字（精简形态）。
 * 跳转由页面在 onClick 接 navigate——本组件不依赖 router。
 *
 * @example
 *   const ENTRIES: EntryItem[] = [
 *     { title: '入库管理', description: '采购入库与快速入库', icon: Icons.Package, onClick: () => navigate('/biz/warehouse/inbound') },
 *   ]
 *   <EntryGrid items={ENTRIES} />
 */
export function EntryGrid({ items, cols = 2, className }: EntryGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3", COLS_CLASS[cols], className)}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
          >
            {Icon && (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon size={20} className="text-primary" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-medium truncate">{item.title}</span>
              {item.description && (
                <span className="block text-xs text-muted-foreground truncate">{item.description}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
