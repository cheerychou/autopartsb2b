import * as React from "react"
import { CaretLeft, CaretRight, DotsThree, CaretLineLeft, CaretLineRight } from "@phosphor-icons/react";
import { cn } from "cn"

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: (total: number, range: [number, number]) => React.ReactNode
  pageSizeOptions?: number[]
  className?: string
  disabled?: boolean
  size?: 'default' | 'small' | 'large'
}

/**
 * 完整的分页器组件
 * 支持页码切换、每页条数切换、快速跳转
 */
const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({ 
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    showSizeChanger = false,
    showQuickJumper = false,
    showTotal,
    pageSizeOptions = [10, 20, 50, 100],
    className,
    disabled = false,
    size = 'default',
    ...props 
  }, ref) => {
    const [jumpPage, setJumpPage] = React.useState(String(page))

    const totalPages = Math.ceil(total / pageSize)
    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
    const endItem = Math.min(page * pageSize, total)

    React.useEffect(() => {
      setJumpPage(String(page))
    }, [page])

    const handlePageChange = (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === page || disabled) {
        return
      }
      onPageChange(newPage)
    }

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newPageSize = Number(e.target.value)
      if (onPageSizeChange && !disabled) {
        onPageSizeChange(newPageSize)
      }
    }

    const handleJumpPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setJumpPage(e.target.value)
    }

    const handleJumpPageSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      const newPage = parseInt(jumpPage, 10)
      if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages && !disabled) {
        onPageChange(newPage)
      }
    }

    const getPageNumbers = () => {
      const pages: (number | string)[] = []
      const showEllipsis = totalPages > 7

      if (!showEllipsis) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (page <= 4) {
          pages.push(1, 2, 3, 4, 5, '...', totalPages)
        } else if (page >= totalPages - 3) {
          pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
        } else {
          pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
        }
      }

      return pages
    }

    const sizeClasses = {
      default: 'h-10 px-4 text-sm',
      small: 'h-8 px-3 text-xs',
      large: 'h-12 px-5 text-base'
    }

    const iconSize = {
      default: 'h-4 w-4',
      small: 'h-3 w-3',
      large: 'h-5 w-5'
    }

    if (total === 0) {
      return null
    }

    return (
      <div 
        ref={ref}
        className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)} 
        {...props}
      >
        {showTotal && (
          <div className="text-sm text-muted-foreground">
            {showTotal(total, [startItem, endItem])}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(1)}
            disabled={page === 1 || disabled}
            className={cn(
              "flex items-center justify-center rounded-md border border-input bg-background",
              "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors",
              sizeClasses[size]
            )}
            aria-label="第一页"
          >
            <CaretLineLeft className={iconSize[size]} />
          </button>

          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || disabled}
            className={cn(
              "flex items-center justify-center rounded-md border border-input bg-background",
              "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors",
              sizeClasses[size]
            )}
            aria-label="上一页"
          >
            <CaretLeft className={iconSize[size]} />
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) => (
              pageNum === '...' ? (
                <span
                  key={`ellipsis-${index}`}
                  className={cn(
                    "flex items-center justify-center",
                    sizeClasses[size]
                  )}
                >
                  <DotsThree className={iconSize[size]} />
                </span>
              ) : (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum as number)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center justify-center rounded-md border",
                    "transition-colors",
                    page === pageNum
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-input bg-background hover:bg-muted",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    sizeClasses[size]
                  )}
                >
                  {pageNum}
                </button>
              )
            ))}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || disabled}
            className={cn(
              "flex items-center justify-center rounded-md border border-input bg-background",
              "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors",
              sizeClasses[size]
            )}
            aria-label="下一页"
          >
            <CaretRight className={iconSize[size]} />
          </button>

          <button
            type="button"
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages || disabled}
            className={cn(
              "flex items-center justify-center rounded-md border border-input bg-background",
              "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors",
              sizeClasses[size]
            )}
            aria-label="最后一页"
          >
            <CaretLineRight className={iconSize[size]} />
          </button>

          {showSizeChanger && (
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={disabled}
              className={cn(
                "ml-2 rounded-md border border-input bg-background px-3 py-2",
                "text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} 条/页
                </option>
              ))}
            </select>
          )}

          {showQuickJumper && (
            <form onSubmit={handleJumpPageSubmit} className="ml-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">跳至</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={handleJumpPageChange}
                disabled={disabled}
                className={cn(
                  "w-16 rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
              <span className="text-sm text-muted-foreground">页</span>
              <button
                type="submit"
                disabled={disabled}
                className={cn(
                  "rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground",
                  "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
                  "transition-colors"
                )}
              >
                确定
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }
)

Pagination.displayName = "Pagination"

export { Pagination }
