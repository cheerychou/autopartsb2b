import * as React from "react"
import { cn } from "cn"

export type DividerOrientation = 'horizontal' | 'vertical'
export type DividerType = 'solid' | 'dashed' | 'dotted'
export type DividerAlign = 'left' | 'center' | 'right'
export type DividerSize = 'small' | 'medium' | 'large'

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: DividerOrientation
  type?: DividerType
  align?: DividerAlign
  text?: React.ReactNode
  size?: 'small' | 'medium' | 'large'
  color?: string
  className?: string
}

/**
 * 分割线组件
 * 比 Separator 更丰富，支持文字、多种样式
 */
const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ 
    orientation = 'horizontal',
    type = 'solid',
    align = 'center',
    text,
    size = 'medium',
    color,
    className,
    ...props 
  }, ref) => {
    const isVertical = orientation === 'vertical'
    
    const getTypeClass = () => {
      const typeMap: Record<DividerType, string> = {
        solid: 'border-solid',
        dashed: 'border-dashed',
        dotted: 'border-dotted'
      }
      return typeMap[type]
    }

    const getBorderWidthClass = () => {
      const sizeMap: Record<DividerSize, string> = {
        small: isVertical ? 'border-l' : 'border-t',
        medium: isVertical ? 'border-l' : 'border-t',
        large: isVertical ? 'border-l' : 'border-t'
      }
      return sizeMap[size]
    }

    const getAlignClass = () => {
      if (isVertical || !text) return ''
      
      const alignMap: Record<DividerAlign, string> = {
        left: 'items-start',
        center: 'items-center',
        right: 'items-end'
      }
      return alignMap[align]
    }

    const getTextMarginClass = () => {
      if (isVertical || !text) return ''
      
      const alignMap: Record<DividerAlign, string> = {
        left: 'mr-4',
        center: 'mx-4',
        right: 'ml-4'
      }
      return alignMap[align]
    }

    const getBorderWidthStyle = () => {
      const sizeMap: Record<DividerSize, string> = {
        small: '1px',
        medium: '1px',
        large: '2px'
      }
      return { borderWidth: sizeMap[size] }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          isVertical ? "h-full" : "w-full",
          isVertical ? "flex-row" : "flex-col",
          getAlignClass(),
          className
        )}
        {...props}
      >
        {text && align === 'left' && (
          <span className={cn("flex-shrink-0 text-sm text-muted-foreground", getTextMarginClass())}>
            {text}
          </span>
        )}
        
        <div
          className={cn(
            "flex-1",
            getTypeClass(),
            getBorderWidthClass(),
            "border-border"
          )}
          style={{
            ...getBorderWidthStyle(),
            ...(color ? { borderColor: color } : {})
          }}
        />
        
        {text && align === 'center' && (
          <span className={cn("flex-shrink-0 text-sm text-muted-foreground", getTextMarginClass())}>
            {text}
          </span>
        )}
        
        {text && align === 'right' && (
          <span className={cn("flex-shrink-0 text-sm text-muted-foreground", getTextMarginClass())}>
            {text}
          </span>
        )}
      </div>
    )
  }
)

Divider.displayName = "Divider"

export { Divider }
