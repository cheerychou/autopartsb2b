import * as React from "react"
import { cn } from "cn"

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number | Record<string, number>
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
  className?: string
}

/**
 * 栅格布局组件
 * 基于CSS Grid实现，支持响应式布局
 */
const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ 
    cols = 12,
    gap = 4,
    align = 'stretch',
    justify = 'start',
    className,
    children,
    ...props 
  }, ref) => {
    const getGridTemplateColumns = () => {
      if (typeof cols === 'number') {
        return `repeat(${cols}, minmax(0, 1fr))`
      }
      
      const breakpoints = ['default', 'sm', 'md', 'lg', 'xl']
      return breakpoints
        .map(bp => {
          const colValue = cols[bp] || cols['default'] || 12
          if (bp === 'default') {
            return `repeat(${colValue}, minmax(0, 1fr))`
          }
          return null
        })
        .filter(Boolean)
        .join(' ')
    }

    const getGapClass = () => {
      const gapMap: Record<number, string> = {
        0: 'gap-0',
        1: 'gap-1',
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        5: 'gap-5',
        6: 'gap-6',
        8: 'gap-8',
        10: 'gap-10',
        12: 'gap-12',
      }
      return gapMap[gap] || 'gap-4'
    }

    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch'
    }

    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      'space-between': 'justify-between',
      'space-around': 'justify-around'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          getGapClass(),
          alignMap[align],
          justifyMap[justify],
          className
        )}
        style={{
          gridTemplateColumns: getGridTemplateColumns()
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Grid.displayName = "Grid"

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: number | Record<string, number>
  offset?: number | Record<string, number>
  order?: number
  className?: string
}

/**
 * 栅格项组件
 */
const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ 
    span = 1,
    offset,
    order,
    className,
    children,
    ...props 
  }, ref) => {
    const getGridColumn = () => {
      if (typeof span === 'number') {
        return `span ${span} / span ${12}`
      }
      
      const breakpoints = ['default', 'sm', 'md', 'lg', 'xl']
      return breakpoints
        .map(bp => {
          const spanValue = span[bp] || span['default'] || 1
          if (bp === 'default') {
            return `span ${spanValue} / span ${12}`
          }
          return null
        })
        .filter(Boolean)
        .join(' ')
    }

    const getGridOffsetStart = () => {
      if (!offset) return undefined
      if (typeof offset === 'number') {
        return offset + 1
      }
      
      const offsetValue = offset['default'] || offset['sm'] || offset['md'] || offset['lg'] || offset['xl']
      return offsetValue !== undefined ? offsetValue + 1 : undefined
    }

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          gridColumn: getGridColumn(),
          gridRowStart: getGridOffsetStart(),
          order
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GridItem.displayName = "GridItem"

export { Grid, GridItem }
