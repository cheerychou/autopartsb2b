import * as React from "react"
import { Minus, Plus } from "@phosphor-icons/react";
import { cn } from "cn"

export interface InputNumberProps {
  value?: number
  onChange?: (value: number | undefined) => void
  min?: number
  max?: number
  step?: number
  precision?: number
  disabled?: boolean
  placeholder?: string
  className?: string
  showControls?: boolean
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  id?: string
  name?: string
  autoFocus?: boolean
  readOnly?: boolean
}

/**
 * 数字输入框组件
 * 支持步进、最小值、最大值、精度控制
 */
const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  ({ 
    value = undefined,
    onChange,
    min = -Infinity,
    max = Infinity,
    step = 1,
    precision = 0,
    disabled = false,
    placeholder = "请输入数字",
    className,
    showControls = false,
    prefix,
    suffix,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string>(value !== undefined ? String(value) : "")

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(String(value))
      }
    }, [value])

    const formatValue = (num: number): string => {
      return precision > 0 ? num.toFixed(precision) : String(num)
    }

    const parseValue = (str: string): number | undefined => {
      if (!str.trim()) return undefined
      const num = parseFloat(str)
      if (isNaN(num)) return undefined
      return num
    }

    const clampValue = (num: number): number => {
      return Math.min(Math.max(num, min), max)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      
      if (newValue === '' || newValue === '-') {
        setInternalValue(newValue)
        onChange?.(undefined)
        return
      }

      const parsed = parseValue(newValue)
      if (parsed !== undefined) {
        setInternalValue(newValue)
        onChange?.(clampValue(parsed))
      }
    }

    const handleBlur = () => {
      if (internalValue === '' || internalValue === '-') {
        setInternalValue('')
        onChange?.(undefined)
        return
      }

      const parsed = parseValue(internalValue)
      if (parsed !== undefined) {
        const clamped = clampValue(parsed)
        setInternalValue(formatValue(clamped))
        onChange?.(clamped)
      } else {
        setInternalValue('')
        onChange?.(undefined)
      }
    }

    const handleIncrement = () => {
      const currentValue = value !== undefined ? value : 0
      const newValue = clampValue(currentValue + step)
      setInternalValue(formatValue(newValue))
      onChange?.(newValue)
    }

    const handleDecrement = () => {
      const currentValue = value !== undefined ? value : 0
      const newValue = clampValue(currentValue - step)
      setInternalValue(formatValue(newValue))
      onChange?.(newValue)
    }

    const canIncrement = value === undefined || value < max
    const canDecrement = value === undefined || value > min

    return (
      <div className={cn("flex items-center", className)}>
        {showControls && (
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || !canDecrement}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-l-md border border-r-0 border-input bg-background",
              "hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed",
              "transition-colors shrink-0"
            )}
            tabIndex={-1}
          >
            <Minus className="h-3 w-3" />
          </button>
        )}

        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={internalValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "flex h-7 w-full min-w-[4ch] rounded-none border border-input bg-background px-1 py-1 text-sm text-center ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !showControls && "rounded-md",
            prefix && "pl-8",
            suffix && "pr-8",
          )}
          {...props}
        />

        {showControls && (
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || !canIncrement}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-r-md border border-l-0 border-input bg-background",
              "hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed",
              "transition-colors shrink-0"
            )}
            tabIndex={-1}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
)

InputNumber.displayName = "InputNumber"

export { InputNumber }
