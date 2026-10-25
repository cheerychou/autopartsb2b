import * as React from "react"
import { cn } from "cn"

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

export interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'name'> {
  value: string
  label: string
  description?: string
}

const RadioGroupContext = React.createContext<{
  name: string
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}>({
  name: '',
  disabled: false,
})

export function RadioGroup({ 
  name, 
  value, 
  onValueChange, 
  disabled = false,
  className, 
  children,
  ...props 
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onValueChange, disabled }}>
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export function RadioGroupItem({ 
  value: itemValue, 
  label, 
  description,
  disabled: itemDisabled = false,
  className,
  ...props 
}: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext)
  const isChecked = context.value === itemValue
  const isDisabled = context.disabled || itemDisabled

  const {
    checked: _checked,
    defaultChecked: _defaultChecked,
    onCheckedChange: _onCheckedChange,
    listType: _listType,
    ...inputProps
  } = props as React.InputHTMLAttributes<HTMLInputElement> & Record<string, unknown>;

  return (
    <label className={cn(
      "flex items-start gap-3 cursor-pointer",
      isDisabled && "cursor-not-allowed opacity-50",
      className
    )}>
      <div className="relative flex items-center">
        <input
          type="radio"
          name={context.name}
          value={itemValue}
          checked={isChecked}
          disabled={isDisabled}
          onChange={(e) => context.onValueChange?.(e.target.value)}
          className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-primary text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...inputProps}
        />
        <div className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center rounded-full",
          isChecked && "bg-primary"
        )}>
          {isChecked && (
            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium leading-none">
          {label}
        </span>
        {description && (
          <span className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
    </label>
  )
}
