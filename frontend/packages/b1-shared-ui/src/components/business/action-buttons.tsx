import * as React from "react"
import { Eye, NotePencil, Trash, DotsThree, Download, Copy } from "@phosphor-icons/react";
import { Button } from "../ui/button"
import { cn } from "cn"

export type ActionType = 'view' | 'edit' | 'delete' | 'download' | 'copy' | 'custom'

export interface ActionButton {
  type?: ActionType
  label?: string
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'xs' | 'icon'
}

export interface ActionButtonsProps {
  actions: ActionButton[]
  maxVisible?: number
  className?: string
  align?: 'left' | 'center' | 'right'
  moreLabel?: string
}

/**
 * 操作按钮组
 * 提供常用的查看、编辑、删除等操作按钮
 */
const ActionButtons = React.forwardRef<HTMLDivElement, ActionButtonsProps>(
  ({ 
    actions,
    maxVisible = 3,
    className,
    align = 'right',
    moreLabel = '更多',
    ...props 
  }, ref) => {
    const [showMore, setShowMore] = React.useState(false)

    const getIcon = (type?: ActionType, customIcon?: React.ReactNode) => {
      if (customIcon) return customIcon
      
      const iconMap: Record<ActionType, React.ReactNode> = {
        view: <Eye className="h-4 w-4" />,
        edit: <NotePencil className="h-4 w-4" />,
        delete: <Trash className="h-4 w-4" />,
        download: <Download className="h-4 w-4" />,
        copy: <Copy className="h-4 w-4" />,
        custom: null
      }
      return iconMap[type || 'custom']
    }

    const getVariant = (type?: ActionType, customVariant?: 'default' | 'ghost' | 'outline') => {
      if (customVariant) return customVariant
      
      const variantMap: Record<ActionType, 'default' | 'ghost' | 'outline'> = {
        view: 'ghost',
        edit: 'ghost',
        delete: 'ghost',
        download: 'ghost',
        copy: 'ghost',
        custom: 'default'
      }
      return variantMap[type || 'custom']
    }

    const visibleActions = actions.slice(0, maxVisible)
    const hiddenActions = actions.slice(maxVisible)

    const getAlignClass = () => {
      const alignMap: Record<NonNullable<ActionButtonsProps['align']>, string> = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end'
      }
      return alignMap[align]
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", getAlignClass(), className)}
        {...props}
      >
        {visibleActions.map((action, index) => (
          <Button
            key={index}
            variant={getVariant(action.type, action.variant)}
            size={action.size || 'icon'}
            onClick={action.onClick}
            disabled={action.disabled}
            loading={action.loading}
            className="h-8 w-8 p-0"
            title={action.label}
          >
            {getIcon(action.type, action.icon)}
          </Button>
        ))}

        {hiddenActions.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMore(!showMore)}
              className="h-8 w-8 p-0"
              title={moreLabel}
            >
              <DotsThree className="h-4 w-4" />
            </Button>

            {showMore && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-md border bg-popover p-1 shadow-lg">
                {hiddenActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick?.()
                      setShowMore(false)
                    }}
                    disabled={action.disabled}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                      "hover:bg-muted",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    )}
                  >
                    {getIcon(action.type, action.icon)}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

ActionButtons.displayName = "ActionButtons"

export { ActionButtons }
