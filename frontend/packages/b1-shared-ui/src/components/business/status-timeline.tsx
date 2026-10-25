import * as React from "react"
import { SealCheck, Clock, WarningCircle, XCircle } from "@phosphor-icons/react";
import { cn } from "cn"

export type StatusType = 'success' | 'pending' | 'error' | 'warning' | 'info' | 'processing'

export interface StatusTimelineItem {
  id: string
  title: string
  description?: string
  time?: string
  status?: StatusType
  icon?: React.ReactNode
}

export interface StatusTimelineProps {
  items: StatusTimelineItem[]
  direction?: 'vertical' | 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

/**
 * 状态时间线
 * 展示流程或状态变更历史
 */
const StatusTimeline = React.forwardRef<HTMLDivElement, StatusTimelineProps>(
  ({ 
    items,
    direction = 'vertical',
    size = 'md',
    showIcon = true,
    className,
    ...props 
  }, ref) => {
    const getStatusIcon = (status?: StatusType) => {
      const iconMap: Record<StatusType, React.ReactNode> = {
        success: <SealCheck className="h-4 w-4 text-success" />,
        pending: <Clock className="h-4 w-4 text-warning" />,
        error: <XCircle className="h-4 w-4 text-destructive" />,
        warning: <WarningCircle className="h-4 w-4 text-warning" />,
        info: <Clock className="h-4 w-4 text-primary" />,
        processing: <Clock className="h-4 w-4 text-primary animate-spin" />
      }
      return iconMap[status || 'pending']
    }

    const getStatusColor = (status?: StatusType) => {
      const colorMap: Record<StatusType, string> = {
        success: 'border-success bg-success-soft',
        pending: 'border-warning bg-warning-soft',
        error: 'border-destructive bg-destructive-soft',
        warning: 'border-warning bg-warning-soft',
        info: 'border-primary bg-primary/10',
        processing: 'border-primary bg-primary/10'
      }
      return colorMap[status || 'pending']
    }

    const getSizeClass = () => {
      const sizeMap: Record<NonNullable<StatusTimelineProps['size']>, string> = {
        sm: 'gap-4',
        md: 'gap-6',
        lg: 'gap-8'
      }
      return sizeMap[size]
    }

    const getIconSizeClass = () => {
      const sizeMap: Record<NonNullable<StatusTimelineProps['size']>, string> = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-10 w-10'
      }
      return sizeMap[size]
    }

    const isVertical = direction === 'vertical'

    return (
      <div
        ref={ref}
        className={cn("flex", isVertical ? "flex-col" : "flex-row", getSizeClass(), className)}
        {...props}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "relative flex",
              isVertical ? "flex-row items-start" : "flex-col items-center",
              index < items.length - 1 && (isVertical ? "pb-6" : "pr-6")
            )}
          >
            {showIcon && (
              <div className={cn(
                "relative z-10 flex-shrink-0 rounded-full border-2 bg-background",
                getIconSizeClass(),
                getStatusColor(item.status)
              )}>
                {item.icon || getStatusIcon(item.status)}
              </div>
            )}

            <div className={cn(
              "flex min-w-0 flex-1 flex-col",
              isVertical ? "ml-4" : "mt-4"
            )}>
              <div className="flex items-baseline gap-2">
                <h4 className="font-medium text-foreground">{item.title}</h4>
                {item.time && (
                  <span className="text-sm text-muted-foreground">{item.time}</span>
                )}
              </div>
              {item.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>

            {index < items.length - 1 && (
              <div className={cn(
                "absolute border-2",
                isVertical 
                  ? "left-3 top-8 bottom-0 w-0.5" 
                  : "left-0 top-3 right-0 h-0.5",
                getStatusColor(item.status)
              )} />
            )}
          </div>
        ))}
      </div>
    )
  }
)

StatusTimeline.displayName = "StatusTimeline"

export { StatusTimeline }
