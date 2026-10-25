import * as React from "react"
import { cn } from "cn"
import { Button } from "../ui/button"
import { Icons } from "../ui/icons"

export interface DateToolbarProps {
  /** 当前区间文本（如「2026年9月30日 - 10月6日」）；格式化归页面（date-fns + zhCN），本组件不做日期运算 */
  label: React.ReactNode
  /** 上一周期回调 */
  onPrevious: () => void
  /** 下一周期回调 */
  onNext: () => void
  /** 传入即渲染「今天」按钮（presence-based，同 PageHeader.onBack 惯例） */
  onToday?: () => void
  /** 粒度，用于无障碍标签（上一日/上一周/上一月），默认 "month" */
  unit?: "day" | "week" | "month"
  /** 右侧附加操作（SegmentTabsA 视图切换、新建按钮等） */
  actions?: React.ReactNode
  className?: string
}

const UNIT_TEXT = { day: "日", week: "周", month: "月" } as const

/**
 * 日期区间翻页器（日历/排班页头部工具栏标准件，规范见
 * docs/frontend/design/ENG-FE-DESIGN-004 §3.3）。
 *
 * 收敛存量各页手写翻页器：[◀][今天][▶] 区间文本 | actions。
 * 参照原型 = 技师排班页工具栏（prev/今天/next + 区间文本 + SegmentTabsA）。
 * 只编排布局不做逻辑：日期状态与 format 全在页面；位置约定为标题通道之下、
 * 主体之上（自绘网格页）；月网格页直接用 CalendarView 自带工具栏，无需本组件。
 *
 * @example 周矩阵排班页
 *   <DateToolbar
 *     label={`${format(weekStart, 'yyyy年M月d日', { locale: zhCN })} - ${format(addDays(weekStart, 6), 'M月d日')}`}
 *     unit="week" onPrevious={prevWeek} onNext={nextWeek} onToday={goToday}
 *     actions={<SegmentTabsA ... />}
 *   />
 */
export function DateToolbar({
  label,
  onPrevious,
  onNext,
  onToday,
  unit = "month",
  actions,
  className,
}: DateToolbarProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onPrevious}
          aria-label={`上一${UNIT_TEXT[unit]}`}
        >
          <Icons.ChevronLeft className="h-4 w-4" />
        </Button>
        {onToday && (
          <Button variant="outline" onClick={onToday}>
            今天
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onNext}
          aria-label={`下一${UNIT_TEXT[unit]}`}
        >
          <Icons.ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium ml-2">{label}</span>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
