import * as React from "react"
import { Input } from "../ui/input"
import { cn } from "cn"
import { Check, X, EnvelopeSimple } from "@phosphor-icons/react";

export interface EmailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onValidate?: (isValid: boolean) => void
  disabled?: boolean
  showValidationIcon?: boolean
  className?: string
  inputClassName?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 邮箱输入框
 * 带有邮箱格式验证
 */
const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ 
    value = '',
    onChange,
    onValidate,
    disabled = false,
    showValidationIcon = true,
    className,
    inputClassName,
    ...props 
  }, ref) => {
    const [isValid, setIsValid] = React.useState<boolean | null>(null)
    const [isTouched, setIsTouched] = React.useState(false)

    React.useEffect(() => {
      if (isTouched) {
        const valid = EMAIL_REGEX.test(value)
        setIsValid(valid)
        onValidate?.(valid)
      }
    }, [value, isTouched, onValidate])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onChange?.(newValue)
      
      if (isTouched) {
        const valid = EMAIL_REGEX.test(newValue)
        setIsValid(valid)
        onValidate?.(valid)
      }
    }

    const handleBlur = () => {
      setIsTouched(true)
      if (value) {
        const valid = EMAIL_REGEX.test(value)
        setIsValid(valid)
        onValidate?.(valid)
      }
    }

    const handleFocus = () => {
      setIsTouched(true)
    }

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          type="email"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder="请输入邮箱地址"
          className={cn(
            "pr-10",
            isValid === false && "border-destructive focus-visible:ring-destructive",
            isValid === true && "border-success focus-visible:ring-success",
            inputClassName
          )}
          {...props}
        />

        {showValidationIcon && isTouched && value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid === true ? (
              <Check className="h-4 w-4 text-success" />
            ) : isValid === false ? (
              <X className="h-4 w-4 text-destructive" />
            ) : (
              <EnvelopeSimple className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    )
  }
)

EmailInput.displayName = "EmailInput"

export { EmailInput }
