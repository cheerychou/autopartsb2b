import * as React from "react"
import { Checkbox } from "../ui/checkbox"
import { cn } from "cn"
import { CaretDown, CaretUp } from "@phosphor-icons/react"

export interface MultiSelectOption {
  label: string
  value: string
}

export interface MultiSelectProps {
  value?: string[]
  defaultValue?: string[]
  /** 兼容 FormField 统一注入的 onChange（与 onValueChange 等价，二选一） */
  onChange?: (value: string[]) => void
  onValueChange?: (value: string[]) => void
  options?: MultiSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

/**
 * 多选下拉组件（react-hook-form 兼容版）
 *
 * 与 Select 一致：同时支持 onChange / onValueChange（内部统一），
 * 便于 FormField（children 版）统一注入 onChange 而无需感知子组件类型。
 * value 为 string[]（选中项 value 数组），空数组表示无选中。
 */
export function MultiSelect({
  value,
  defaultValue,
  onChange,
  onValueChange,
  options = [],
  placeholder = '请选择',
  disabled = false,
  className,
  id,
  name,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedValues = value ?? defaultValue ?? []
  const handleChange = onValueChange ?? onChange

  const selectedLabels = options
    .filter((opt) => selectedValues.includes(opt.value))
    .map((opt) => opt.label)
    .join('、')

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        id={id}
        name={name}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className={cn("truncate", selectedLabels ? 'text-foreground' : 'text-muted-foreground')}>
          {selectedLabels || placeholder}
        </span>
        {isOpen ? (
          <CaretUp className="h-4 w-4 opacity-50 shrink-0" />
        ) : (
          <CaretDown className="h-4 w-4 opacity-50 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent"
            >
              <Checkbox
                checked={selectedValues.includes(opt.value)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedValues, opt.value]
                    : selectedValues.filter((v) => v !== opt.value)
                  handleChange?.(next)
                }}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
