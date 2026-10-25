import * as React from "react"
import { cn } from "cn"

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  gutter?: number | [number, number]
  align?: 'top' | 'middle' | 'bottom'
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  wrap?: boolean
  className?: string
}

/**
 * 行组件
 * 基于 Flexbox 实现的行布局
 */
const Row = React.forwardRef<HTMLDivElement, RowProps>(
  ({ 
    gutter = 0,
    align = 'top',
    justify = 'start',
    wrap = true,
    className,
    children,
    ...props 
  }, ref) => {
    const getGutterStyle = () => {
      if (typeof gutter === 'number') {
        return { marginLeft: -gutter / 2, marginRight: -gutter / 2 }
      }
      return { marginLeft: -gutter[0] / 2, marginRight: -gutter[1] / 2 }
    }

    const getAlignClass = () => {
      const alignMap: Record<NonNullable<RowProps['align']>, string> = {
        top: 'items-start',
        middle: 'items-center',
        bottom: 'items-end'
      }
      return alignMap[align]
    }

    const getJustifyClass = () => {
      const justifyMap: Record<NonNullable<RowProps['justify']>, string> = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        'space-between': 'justify-between',
        'space-around': 'justify-around',
        'space-evenly': 'justify-evenly'
      }
      return justifyMap[justify]
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          wrap && 'flex-wrap',
          getAlignClass(),
          getJustifyClass(),
          className
        )}
        style={getGutterStyle()}
        {...props}
      >
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            const gutterValue = typeof gutter === 'number' ? gutter : gutter[0]
            const childProps = child.props as Record<string, unknown>
            return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              style: {
                paddingLeft: gutterValue / 2,
                paddingRight: gutterValue / 2,
                ...(childProps.style as React.CSSProperties)
              }
            })
          }
          return child
        })}
      </div>
    )
  }
)

Row.displayName = "Row"

export interface ColProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: number
  offset?: number
  order?: number
  flex?: string | number
  className?: string
}

/**
 * 列组件
 * 基于 Flexbox 实现的列布局
 */
const Col = React.forwardRef<HTMLDivElement, ColProps>(
  ({ 
    span = 24,
    offset = 0,
    order,
    flex,
    className,
    children,
    ...props 
  }, ref) => {
    const getFlexStyle = () => {
      if (flex !== undefined) {
        return { flex }
      }
      return {}
    }

    const getFlexBasis = () => {
      if (flex !== undefined) {
        return {}
      }
      return { flexBasis: `${(span / 24) * 100}%` }
    }

    const getMaxWidth = () => {
      if (flex !== undefined) {
        return {}
      }
      return { maxWidth: `${(span / 24) * 100}%` }
    }

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          ...getFlexStyle(),
          ...getFlexBasis(),
          ...getMaxWidth(),
          marginLeft: offset > 0 ? `${(offset / 24) * 100}%` : undefined,
          order
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Col.displayName = "Col"

export { Row, Col }
