import * as React from "react"
import type { HTMLAttributes } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import { Skeleton } from "../ui/skeleton"
import { Button } from "../ui/button"
import { cn } from "cn"
import { ErrorState } from "../ui/error-state"
import { toErrorMessage } from "../../lib/normalize-error"
import { CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react";

export interface Column<T> {
  key: keyof T | string
  title: string
  render?: (item: T, index?: number) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

/**
 * 行展开配置（optional，传入即启用；消息中心等「行内看全文」场景。
 * 向后兼容：不传 expandable 行为零变化。）
 */
export interface DataTableExpandable<T> {
  /** 展开区渲染内容（传入即启用展开能力） */
  expandedRowRender: (row: T) => React.ReactNode
  /** 受控展开行键集合；缺省组件内部自管 */
  expandedRowKeys?: string[]
  /** 受控模式回调 */
  onExpandedRowKeysChange?: (keys: string[]) => void
  /** 行键提取；缺省取 row.id */
  rowKey?: (row: T) => string
}

export interface DataTableProps<T extends object> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** 错误（truthy 时在表格区渲染 ErrorState；兼容 Error 对象 / string） */
  error?: unknown
  /** 错误重试回调（通常接 useQueryData 的 refresh） */
  onRetry?: () => void
  className?: string
  density?: "compact" | "default" | "comfortable"
  /** 行展开配置（optional；见 DataTableExpandable） */
  expandable?: DataTableExpandable<T>

  // 分页相关
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void

  // 排序相关
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void

  // 行属性自定义（用于点击事件、选中样式等）
  getRowProps?: (item: T) => HTMLAttributes<HTMLTableRowElement>
  getRowKey?: (item: T, index: number) => React.Key
}

/** 骨架屏表格行数量 */
const SKELETON_ROWS = 5;

/**
 * 渲染骨架屏加载行
 */
function SkeletonRows({ columns, hasExpand = false }: { columns: Column<unknown>[]; hasExpand?: boolean }) {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
        <TableRow key={`skeleton-${rowIdx}`}>
          {hasExpand && (
            <TableCell key={`skeleton-${rowIdx}-expand`} className="w-10">
              <Skeleton className="h-4 w-4" />
            </TableCell>
          )}
          {columns.map((col, colIdx) => (
            <TableCell
              key={`skeleton-${rowIdx}-${colIdx}`}
              className={col.width || ''}
              style={{ textAlign: col.align || 'left' }}
            >
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * 通用数据表格组件
 * 内置骨架屏加载状态、空状态和基础分页；optional 行展开（expandable）
 */
export function DataTable<T extends object = Record<string, unknown>>({
  data,
  columns,
  loading = false,
  emptyTitle = "暂无数据",
  emptyDescription = "没有找到相关记录",
  error,
  onRetry,
  expandable,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  className,
  density = "default",
  sortKey,
  sortOrder,
  onSort,
  getRowProps,
  getRowKey,
}: DataTableProps<T>) {

  const totalPages = Math.ceil(total / pageSize)

  // 行展开态：受控（expandedRowKeys）优先，否则内部自管；翻页重置内部展开态
  // （渲染期 prop 变化重置模式，react-hooks/set-state-in-effect 禁 effect 内 setState）
  const [prevPage, setPrevPage] = React.useState(page)
  const [internalExpandedKeys, setInternalExpandedKeys] = React.useState<Set<string>>(new Set())
  if (prevPage !== page) {
    setPrevPage(page)
    setInternalExpandedKeys(new Set())
  }
  const expandedKeys = expandable?.expandedRowKeys
    ? new Set(expandable.expandedRowKeys)
    : internalExpandedKeys

  const resolveRowKey = (item: T, index: number): string => {
    if (expandable?.rowKey) return expandable.rowKey(item)
    if (getRowKey) return String(getRowKey(item, index))
    const id = (item as unknown as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return String(id)
    return String(index)
  }

  const toggleExpanded = (key: string) => {
    if (expandable?.onExpandedRowKeysChange) {
      const next = new Set(expandedKeys)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      expandable.onExpandedRowKeysChange(Array.from(next))
    } else {
      setInternalExpandedKeys((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    }
  }

  const hasExpand = !!expandable
  const columnSpan = columns.length + (hasExpand ? 1 : 0)

  const hasError = !!error;
  const isEmpty = !loading && !hasError && data.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border overflow-hidden">
        <div className={cn(
          "transition-opacity duration-normal",
          loading && data.length > 0 && "opacity-50 pointer-events-none"
        )}>
          <Table className={`table-fixed ${className || ''}`} density={density}>
            <TableHeader>
              <TableRow>
                {hasExpand && (
                  <TableHead className="w-10" aria-label="展开" />
                )}
                {columns.map((col) => (
                  <TableHead
                    key={String(col.key)}
                    className={`${col.width || ''} ${col.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    style={{ textAlign: col.align || 'left' }}
                    onClick={() => col.sortable && onSort?.(String(col.key))}
                  >
                    {col.title}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 && (
                <SkeletonRows columns={columns as Column<unknown>[]} hasExpand={hasExpand} />
              )}
              {!loading && hasError && (
                <TableRow>
                  <TableCell colSpan={columnSpan}>
                    <ErrorState message={toErrorMessage(error)} onRetry={onRetry} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && isEmpty && (
                <TableRow>
                  <TableCell colSpan={columnSpan} className="h-48 text-center">
                    <div>
                      <p className="text-base font-medium">{emptyTitle}</p>
                      {emptyDescription && <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isEmpty && data.map((item, index) => {
                const rowKey = resolveRowKey(item, index)
                const expanded = hasExpand && expandedKeys.has(rowKey)
                return (
                  <React.Fragment key={(() => {
                    if (getRowKey) return String(getRowKey(item, index))
                    const id = (item as unknown as { id?: unknown }).id
                    if (typeof id === 'string' || typeof id === 'number') return id
                    return String(index)
                  })()}>
                    <TableRow
                      {...(getRowProps ? getRowProps(item) : {})}
                    >
                      {hasExpand && (
                        <TableCell className="w-10">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={expanded ? '收起' : '展开'}
                            onClick={() => toggleExpanded(rowKey)}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {expanded ? <CaretDown className="h-3.5 w-3.5" /> : <CaretRight className="h-3.5 w-3.5" />}
                          </button>
                        </TableCell>
                      )}
                      {columns.map((col) => {
                        const cellContent = col.render
                          ? col.render(item, index)
                          : (() => {
                              const value = (item as unknown as Record<string, unknown>)[String(col.key)]
                              if (value === null || value === undefined) return ''
                              if (typeof value === 'bigint') return value.toString()
                              if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
                              return ''
                            })()
                        return (
                          <TableCell
                            key={`${rowKey}-${String(col.key)}`}
                            className={`overflow-hidden ${col.width || ''}`}
                            style={{ textAlign: col.align || 'left' }}
                          >
                            {cellContent}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                    {expanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={columnSpan} className="px-4 py-3">
                          {expandable!.expandedRowRender(item)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 简易分页条 */}
      {onPageChange && total > 0 && (
        <div className="flex items-center justify-end gap-2 py-4">
          <div className="text-sm text-muted-foreground">
            第 {page} 页 / 共 {totalPages} 页
          </div>
          <Button
            variant="outline"
           
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <CaretLeft className="h-4 w-4" />
            上一页
          </Button>
          <Button
            variant="outline"
           
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            下一页
            <CaretRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
