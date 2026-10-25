import * as React from "react"
import { cn } from "cn"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  description?: string
  onCheckedChange?: (checked: boolean) => void
}

/**
 * Switch 开关组件
 * 支持 controlled（checked + onCheckedChange）和 uncontrolled（defaultChecked）两种模式
 */
const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, checked, disabled, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
    }

    return (
      <label className={cn(
        "flex items-center gap-3 cursor-pointer",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}>
        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 peer">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="peer h-6 w-11 cursor-pointer appearance-none rounded-full border-2 border-input bg-background transition-colors duration-normal ease-in-out checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
          />
          <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-background shadow-md transition-transform duration-normal ease-in-out peer-checked:translate-x-5" />
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className="text-sm font-medium leading-none">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
