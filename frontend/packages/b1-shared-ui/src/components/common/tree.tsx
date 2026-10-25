import * as React from "react"
import { cn } from "cn"
import { CaretRight } from "@phosphor-icons/react"
import { Checkbox } from "../ui/checkbox"
import { Spinner } from "../ui/spinner"
import { EmptyState } from "../ui/empty-state"

/** 树节点标准数据结构（页面数据 map 一次即可接入） */
export interface TreeNodeData {
  id: string
  /** 节点主文案（string 或自定义渲染） */
  label: React.ReactNode
  children?: TreeNodeData[]
}

export interface TreeProps {
  data: TreeNodeData[]
  /** 受控展开集合（不传走内部非受控状态，默认全收起） */
  expandedIds?: Set<string>
  onExpandedChange?: (ids: Set<string>) => void
  defaultExpandedIds?: Set<string>
  /** 单选选中 id（选中驱动主内容区的场景） */
  selectedId?: string
  onSelect?: (id: string) => void
  /**
   * 勾选集合（父子精确级联：勾父=自身+全部后代入集，取消对称反向；
   * 集合始终精确，无半选态）。与 onSelect 互斥使用。
   */
  checkedIds?: Set<string>
  onCheckedChange?: (ids: Set<string>) => void
  /** 节点行尾操作区（hover 显隐），如「子部门/编辑/删除」按钮组 */
  renderNodeActions?: (node: TreeNodeData) => React.ReactNode
  loading?: boolean
  emptyTitle?: string
  className?: string
}

/** 收集 node 的全部后代 id（含各级 children） */
function collectDescendantIds(node: TreeNodeData): string[] {
  if (!node.children) return []
  return node.children.flatMap((c) => [c.id, ...collectDescendantIds(c)])
}

/**
 * 树形基础组件（页面分类学「树形列表认可变体」的组件归口，
 * 收编 store/platform 权限树与部门树的 4 份复制件）
 *
 * 只管树渲染与交互语义：展开/折叠、单选选中、勾选精确级联、节点操作插槽、三态。
 * 不规定布局：左树右表（`flex` + 左栏定宽）或单栏全页树由页面自组。
 * 节点行内字段各异时，把页面数据 map 成 TreeNodeData（label 可传自定义渲染）。
 */
export function Tree({
  data,
  expandedIds,
  onExpandedChange,
  defaultExpandedIds,
  selectedId,
  onSelect,
  checkedIds,
  onCheckedChange,
  renderNodeActions,
  loading = false,
  emptyTitle = "暂无数据",
  className,
}: TreeProps) {
  const [internalExpanded, setInternalExpanded] = React.useState<Set<string>>(
    () => defaultExpandedIds ?? new Set()
  )
  const isControlledExpanded = expandedIds !== undefined
  const expanded = isControlledExpanded ? expandedIds : internalExpanded

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    if (!isControlledExpanded) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  const toggleChecked = (node: TreeNodeData) => {
    if (!checkedIds || !onCheckedChange) return
    const next = new Set(checkedIds)
    if (next.has(node.id)) {
      // 取消：自身 + 全部后代出集
      next.delete(node.id)
      for (const id of collectDescendantIds(node)) next.delete(id)
    } else {
      // 勾上：自身 + 全部后代入集
      next.add(node.id)
      for (const id of collectDescendantIds(node)) next.add(id)
    }
    onCheckedChange(next)
  }

  const renderNodes = (nodes: TreeNodeData[], level: number) => (
    <ul role={level === 0 ? "tree" : "group"} className="flex flex-col">
      {nodes.map((node) => {
        const hasChildren = !!node.children?.length
        const isExpanded = expanded.has(node.id)
        const isSelected = selectedId === node.id
        const isChecked = checkedIds?.has(node.id) ?? false
        return (
          <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
            <div
              className={cn(
                "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted",
                isSelected && "bg-muted font-medium"
              )}
              style={{ paddingLeft: level * 24 + 8 }}
              onClick={() => onSelect?.(node.id)}
            >
              {/* 展开/折叠箭头：无子节点占位对齐 */}
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={isExpanded ? "折叠" : "展开"}
                  className="shrink-0 rounded p-0.5 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(node.id)
                  }}
                >
                  <CaretRight
                    size={14}
                    className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-90")}
                  />
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}
              {checkedIds && onCheckedChange && (
                <Checkbox
                  checked={isChecked}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggleChecked(node)}
                  aria-label={`选择 ${typeof node.label === "string" ? node.label : node.id}`}
                />
              )}
              <span className="truncate">{node.label}</span>
              {renderNodeActions && (
                <span
                  className="ml-auto hidden shrink-0 items-center gap-1 group-hover:flex"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderNodeActions(node)}
                </span>
              )}
            </div>
            {hasChildren && isExpanded && renderNodes(node.children!, level + 1)}
          </li>
        )
      })}
    </ul>
  )

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-10", className)}>
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn("py-6", className)}>
        <EmptyState size="sm" title={emptyTitle} />
      </div>
    )
  }

  return <div className={cn("min-w-0", className)}>{renderNodes(data, 0)}</div>
}
