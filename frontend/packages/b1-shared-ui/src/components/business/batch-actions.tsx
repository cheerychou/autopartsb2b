import * as React from "react"
import { Check, X } from "@phosphor-icons/react";
import { Button } from "../ui/button"
import { cn } from "cn"

export interface BatchAction {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'default' | 'danger' | 'ghost'
}

export interface BatchActionsProps {
  selectedCount: number
  totalCount: number
  actions: BatchAction[]
  onSelectAll?: () => void
  onClearSelection?: () => void
  allSelected?: boolean
  className?: string
  position?: 'top' | 'bottom' | 'sticky'
}

/**
 * 批量操作栏
 * 用于表格或列表的批量操作
 */
const BatchActions = React.forwardRef<HTMLDivElement, BatchActionsProps>(
  ({ 
    selectedCount,
    totalCount,
    actions,
    onSelectAll,
    onClearSelection,
    allSelected,
    className,
    position = 'sticky',
    ...props 
  }, ref) => {
    const getPositionClass = () => {
      const positionMap: Record<NonNullable<BatchActionsProps['position']>, string> = {
        top: 'top-0',
        bottom: 'bottom-0',
        sticky: 'sticky top-0 z-10'
      }
      return positionMap[position]
    }

    const getVariantClass = (variant?: BatchAction['variant']) => {
      const variantMap: Record<NonNullable<BatchAction['variant']>, string> = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        danger: 'bg-destructive text-white hover:bg-destructive',
        ghost: 'bg-transparent text-foreground hover:bg-muted'
      }
      return variantMap[variant || 'default']
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-4 border-b bg-background p-4",
          getPositionClass(),
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
             
              onClick={onSelectAll}
              className="h-8 w-8 p-0"
              title={allSelected ? "取消全选" : "全选"}
            >
              {allSelected ? (
                <X className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>

            <div className="text-sm">
              <span className="font-medium text-foreground">
                已选择 {selectedCount} 项
              </span>
              <span className="text-muted-foreground">
                {' '} / 共 {totalCount} 项
              </span>
            </div>
          </div>

          {onClearSelection && selectedCount > 0 && (
            <Button
              variant="ghost"
             
              onClick={onClearSelection}
              className="h-8"
            >
              清空选择
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
             
              onClick={action.onClick}
              disabled={action.disabled || selectedCount === 0}
              loading={action.loading}
              className={cn("h-8", getVariantClass(action.variant))}
            >
              {action.icon && (
                <span className="mr-1.5">{action.icon}</span>
              )}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    )
  }
)

BatchActions.displayName = "BatchActions"

export { BatchActions }
