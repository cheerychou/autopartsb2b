import * as React from "react"
import { cn } from "cn"

export type SpaceDirection = 'horizontal' | 'vertical'
export type SpaceAlign = 'start' | 'center' | 'end' | 'baseline'
export type SpaceSize = number | 'small' | 'middle' | 'large'

export interface SpaceProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: SpaceDirection
  size?: SpaceSize
  align?: SpaceAlign
  wrap?: boolean
  split?: React.ReactNode
  className?: string
}

/**
 * 间距组件
 * 为子元素提供统一的间距
 */
const Space = React.forwardRef<HTMLDivElement, SpaceProps>(
  ({ 
    direction = 'horizontal',
    size = 'small',
    align = 'center',
    wrap = false,
    split,
    className,
    children,
    ...props 
  }, ref) => {
    const getSizeClass = () => {
      const sizeMap: Record<SpaceSize, string> = {
        small: 'gap-2',
        middle: 'gap-4',
        large: 'gap-6',
      }
      
      if (typeof size === 'number') {
        return ''
      }
      
      return sizeMap[size]
    }

    const getGapStyle = () => {
      if (typeof size === 'number') {
        return { gap: `${size}px` }
      }
      return {}
    }

    const getDirectionClass = () => {
      return direction === 'horizontal' ? 'flex-row' : 'flex-col'
    }

    const getAlignClass = () => {
      const alignMap: Record<SpaceAlign, string> = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        baseline: 'items-baseline'
      }
      return alignMap[align]
    }

    const childrenArray = React.Children.toArray(children)

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          getDirectionClass(),
          getAlignClass(),
          wrap && 'flex-wrap',
          getSizeClass(),
          className
        )}
        style={getGapStyle()}
        {...props}
      >
        {childrenArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {split && index < childrenArray.length - 1 && (
              <span className={cn(
                "flex-shrink-0",
                direction === 'horizontal' ? 'w-px h-full' : 'h-px w-full'
              )}>
                {split}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }
)

Space.displayName = "Space"

export { Space }
