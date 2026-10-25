import * as React from "react"
import { Plus, Funnel, MagnifyingGlass, ArrowClockwise, Download, ShareNetwork } from "@phosphor-icons/react";
import { Button } from "../ui/button"
import { cn } from "cn"

export type QuickActionType = 'add' | 'filter' | 'search' | 'refresh' | 'download' | 'share' | 'custom'

export interface QuickAction {
  type?: QuickActionType
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'default' | 'primary' | 'ghost' | 'outline'
  badge?: string | number
}

export interface QuickActionsProps {
  actions: QuickAction[]
  align?: 'left' | 'center' | 'right'
  direction?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * 快捷操作按钮
 * 提供常用的快捷操作入口
 */
const QuickActions = React.forwardRef<HTMLDivElement, QuickActionsProps>(
  ({ 
    actions,
    align = 'right',
    direction = 'horizontal',
    size = 'md',
    className,
    ...props 
  }, ref) => {
    const getIcon = (type?: QuickActionType, customIcon?: React.ReactNode) => {
      if (customIcon) return customIcon
      
      const iconMap: Record<QuickActionType, React.ReactNode> = {
        add: <Plus className="h-4 w-4" />,
        filter: <Funnel className="h-4 w-4" />,
        search: <MagnifyingGlass className="h-4 w-4" />,
        refresh: <ArrowClockwise className="h-4 w-4" />,
        download: <Download className="h-4 w-4" />,
        share: <ShareNetwork className="h-4 w-4" />,
        custom: null
      }
      return iconMap[type || 'custom']
    }

    const getSizeClass = () => {
      const sizeMap: Record<NonNullable<QuickActionsProps['size']>, string> = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-base'
      }
      return sizeMap[size]
    }

    const getAlignClass = () => {
      const alignMap: Record<NonNullable<QuickActionsProps['align']>, string> = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end'
      }
      return alignMap[align]
    }

    const getDirectionClass = () => {
      return direction === 'horizontal' ? 'flex-row' : 'flex-col'
    }

    const getVariantClass = (variant?: QuickAction['variant']) => {
      const variantMap: Record<NonNullable<QuickAction['variant']>, string> = {
        default: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'bg-transparent hover:bg-muted',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
      }
      return variantMap[variant || 'default']
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          getDirectionClass(),
          getAlignClass(),
          "gap-2",
          className
        )}
        {...props}
      >
        {actions.map((action, index) => (
          <div key={index} className="relative">
            <Button
              variant={action.variant === 'primary' ? 'default' : action.variant}
              size={size === 'sm' ? 'xs' : size === 'lg' ? 'default' : 'default'}
              onClick={action.onClick}
              disabled={action.disabled}
              loading={action.loading}
              className={cn(
                getSizeClass(),
                getVariantClass(action.variant)
              )}
            >
              {getIcon(action.type, action.icon) && (
                <span className="mr-1.5">{getIcon(action.type, action.icon)}</span>
              )}
              {action.label}
            </Button>

            {action.badge !== undefined && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-medium text-white">
                {typeof action.badge === 'number' && action.badge > 99 ? '99+' : action.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }
)

QuickActions.displayName = "QuickActions"

export { QuickActions }
