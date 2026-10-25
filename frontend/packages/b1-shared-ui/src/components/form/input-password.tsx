import * as React from "react"
import { Eye, EyeSlash, Lock } from "@phosphor-icons/react";
import { cn } from "cn"

export interface InputPasswordProps {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  label?: string
  required?: boolean
  description?: string
  error?: string
  showStrengthIndicator?: boolean
  minLength?: number
  maxLength?: number
  id?: string
  name?: string
  autoFocus?: boolean
  readOnly?: boolean
}

/**
 * 密码输入框组件
 * 支持显示/隐藏切换、密码强度指示器
 */
const InputPassword = React.forwardRef<HTMLInputElement, InputPasswordProps>(
  ({ 
    value = "",
    onChange,
    disabled = false,
    placeholder = "请输入密码",
    className,
    label,
    required,
    description,
    error,
    showStrengthIndicator = false,
    minLength,
    maxLength,
    id,
    name,
    autoFocus,
    readOnly,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
      if (!password) {
        return { score: 0, label: "未输入", color: "bg-muted" }
      }

      let score = 0
      if (password.length >= 8) score += 1
      if (password.length >= 12) score += 1
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
      if (/\d/.test(password)) score += 1
      if (/[^a-zA-Z0-9]/.test(password)) score += 1

      const strengthMap = {
      0: { score: 0, label: "未输入", color: "bg-muted" },
      1: { score: 1, label: "弱", color: "bg-destructive" },
      2: { score: 2, label: "较弱", color: "bg-warning" },
      3: { score: 3, label: "中等", color: "bg-warning" },
      4: { score: 4, label: "较强", color: "bg-success" },
      5: { score: 5, label: "强", color: "bg-success" }
    }

    return strengthMap[score as keyof typeof strengthMap] || strengthMap[0]
    }

    const strength = calculatePasswordStrength(value)

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <Lock className={cn(
            "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors",
            error && "text-destructive"
          )} />
          
          <input
            ref={ref}
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            id={id}
            name={name}
            autoFocus={autoFocus}
            readOnly={readOnly}
            minLength={minLength}
            maxLength={maxLength}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-10 py-2 text-sm ring-offset-background",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            {...props}
          />
          
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            className={cn(
              "absolute right-3 top-2.5 flex items-center justify-center",
              "text-muted-foreground hover:text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeSlash className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {showStrengthIndicator && value && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    level <= strength.score ? strength.color : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className={cn("text-xs", strength.score >= 4 ? "text-success" : strength.score >= 2 ? "text-warning" : "text-destructive")}>
              密码强度: {strength.label}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        {description && !error && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    )
  }
)

InputPassword.displayName = "InputPassword"

export { InputPassword }
