import * as React from "react"
import { cn } from "cn"

export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type ContainerAlign = 'left' | 'center' | 'right'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize
  align?: ContainerAlign
  padding?: boolean | 'small' | 'medium' | 'large'
  background?: boolean
  rounded?: boolean
  shadow?: boolean
  className?: string
}

/**
 * 容器组件
 * 提供统一的容器样式和尺寸
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ 
    size = 'md',
    align = 'center',
    padding = true,
    background = false,
    rounded = false,
    shadow = false,
    className,
    children,
    ...props 
  }, ref) => {
    const getSizeClass = () => {
      const sizeMap: Record<ContainerSize, string> = {
        xs: 'max-w-xs',
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-full'
      }
      return sizeMap[size]
    }

    const getAlignClass = () => {
      const alignMap: Record<ContainerAlign, string> = {
        left: 'ml-auto mr-0',
        center: 'mx-auto',
        right: 'ml-0 mr-auto'
      }
      return alignMap[align]
    }

    const getPaddingClass = () => {
      if (!padding) return ''
      
      const paddingMap: Record<'small' | 'medium' | 'large', string> = {
        small: 'p-4',
        medium: 'p-6',
        large: 'p-8'
      }
      
      return padding === true ? 'p-6' : paddingMap[padding]
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full",
          getSizeClass(),
          getAlignClass(),
          getPaddingClass(),
          background && "bg-background",
          rounded && "rounded-lg",
          shadow && "shadow-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Container.displayName = "Container"

export { Container }
