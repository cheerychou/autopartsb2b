import * as React from "react"
import { Input } from "../ui/input"
import { cn } from "cn"
import { Check, X, Link, ArrowUpRight } from "@phosphor-icons/react";

export interface UrlInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onValidate?: (isValid: boolean) => void
  disabled?: boolean
  showValidationIcon?: boolean
  showOpenButton?: boolean
  className?: string
  inputClassName?: string
}

const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/

/**
 * URL 输入框
 * 带有 URL 格式验证和打开链接功能
 */
const UrlInput = React.forwardRef<HTMLInputElement, UrlInputProps>(
  ({ 
    value = '',
    onChange,
    onValidate,
    disabled = false,
    showValidationIcon = true,
    showOpenButton = true,
    className,
    inputClassName,
    ...props 
  }, ref) => {
    const [isValid, setIsValid] = React.useState<boolean | null>(null)
    const [isTouched, setIsTouched] = React.useState(false)

    React.useEffect(() => {
      if (isTouched) {
        const valid = URL_REGEX.test(value)
        setIsValid(valid)
        onValidate?.(valid)
      }
    }, [value, isTouched, onValidate])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onChange?.(newValue)
      
      if (isTouched) {
        const valid = URL_REGEX.test(newValue)
        setIsValid(valid)
        onValidate?.(valid)
      }
    }

    const handleBlur = () => {
      setIsTouched(true)
      if (value) {
        const valid = URL_REGEX.test(value)
        setIsValid(valid)
        onValidate?.(valid)
      }
    }

    const handleFocus = () => {
      setIsTouched(true)
    }

    const handleOpenUrl = () => {
      if (value && isValid) {
        let url = value
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url
        }
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          type="url"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={'请输入网址 (例如: example.com)'}
          className={cn(
            "pr-20",
            isValid === false && "border-destructive focus-visible:ring-destructive",
            isValid === true && "border-success focus-visible:ring-success",
            inputClassName
          )}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showValidationIcon && isTouched && value && (
            <>
              {isValid === true ? (
                <Check className="h-4 w-4 text-success" />
              ) : isValid === false ? (
                <X className="h-4 w-4 text-destructive" />
              ) : (
                <Link className="h-4 w-4 text-muted-foreground" />
              )}
            </>
          )}

          {showOpenButton && isValid && value && (
            <button
              type="button"
              onClick={handleOpenUrl}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded hover:bg-accent"
              title="打开链接"
            >
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    )
  }
)

UrlInput.displayName = "UrlInput"

export { UrlInput }
