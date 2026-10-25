import * as React from "react"
import { LayoutGroup, motion } from "motion/react"
import { cn } from "cn"

export interface SegmentItem { value: string; label: string }

export interface SegmentTabsAProps<T extends string = string> {
  items: SegmentItem[]
  value: T
  onChange: (v: T) => void
  idPrefix?: string
  className?: string
}

/**
 * SegmentTabsA: Accessible segmented tabs with animated highlight.
 * - Renders a tablist with tabs using ARIA roles and focus management
 * - Selected tab shows an animated background highlight using motion layoutId
 * - The highlight slides smoothly between tabs when switching
 */
export function SegmentTabsA<T extends string = string>({ items, value, onChange, idPrefix = "segment-a", className }: SegmentTabsAProps<T>) {
  const selectedIndex = React.useMemo(() => items.findIndex(i => i.value === value), [items, value])
  const groupId = React.useId()

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
    const last = items.length - 1
    let nextIdx = idx
    if (e.key === "ArrowRight") nextIdx = idx >= last ? 0 : idx + 1
    else if (e.key === "ArrowLeft") nextIdx = idx <= 0 ? last : idx - 1
    else if (e.key === "Home") nextIdx = 0
    else if (e.key === "End") nextIdx = last
    else if (e.key === "Enter" || e.key === " ") onChange(items[idx].value as T)
    if (nextIdx !== idx && (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End")) {
      const nextTabId = getSegmentAriaIds(idPrefix, items[nextIdx].value).tabId
      const el = document.getElementById(nextTabId)
      el?.focus()
    }
  }

  return (
    <LayoutGroup id={groupId}>
      <div role="tablist" aria-label="Segment A" className={cn("relative inline-flex items-center h-10 rounded-lg border bg-muted/60 p-0.5 text-muted-foreground", className)}>
        {items.map((s, idx) => {
          const { tabId } = getSegmentAriaIds(idPrefix, s.value)
          const selected = idx === selectedIndex
          return (
            <div
              key={s.value}
              id={tabId}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(s.value as T)}
              onKeyDown={(e) => onKeyDown(e, idx)}
              className={cn(
                "relative z-[1] shrink-0 min-w-[4.5rem] px-4 py-2 text-sm cursor-pointer select-none transition-colors duration-fast text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {selected && (
                <>
                  {/* 选中背景色块（无描边） */}
                  <motion.span
                    layoutId="segment-highlight"
                    className="absolute inset-0 rounded-md bg-muted/40"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                  {/* 选中下划线：独立矩形条（-bottom-0.5 抵消容器 p-0.5，贴齐外框底缘）——
                      矩形无圆角包边，是纯直线，不会出现 border 沿圆角上翘的“翘边”效果 */}
                  <motion.span
                    layoutId="segment-underline"
                    className="absolute inset-x-0 -bottom-0.5 h-1 bg-primary"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                </>
              )}
              <span className="relative z-[1]">{s.label}</span>
            </div>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

/**
 * getSegmentAriaIds: Generate consistent tab/panel IDs for ARIA association.
 */
function getSegmentAriaIds(prefix: string, value: string) {
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, "-")
  return {
    tabId: `${prefix}-tab-${safe}`,
    panelId: `${prefix}-panel-${safe}`,
  }
}
