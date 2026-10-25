import * as React from "react"
import { cn } from "cn"

export interface VerificationCodeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  length?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
  pattern?: RegExp
  className?: string
  inputClassName?: string
}

/**
 * 验证码输入框
 * 用于输入短信验证码、邮箱验证码等
 */
const VerificationCode = React.forwardRef<HTMLDivElement, VerificationCodeProps>(
  ({ 
    length = 6,
    value = '',
    onChange,
    onComplete,
    disabled = false,
    autoFocus = true,
    pattern = /^[0-9]$/,
    className,
    inputClassName,
    ...props 
  }, ref) => {
    const [focusedIndex, setFocusedIndex] = React.useState(0)
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

    const values = React.useMemo(() => {
      const arr = Array(length).fill('')
      value.split('').forEach((char, index) => {
        if (index < length) {
          arr[index] = char
        }
      })
      return arr
    }, [value, length])

    React.useEffect(() => {
      if (autoFocus && inputRefs.current[0]) {
        inputRefs.current[0]?.focus()
      }
    }, [autoFocus])

    const handleFocus = (index: number) => {
      setFocusedIndex(index)
    }

    const handleChange = (index: number, inputValue: string) => {
      if (!pattern.test(inputValue)) {
        return
      }

      const newValues = [...values]
      newValues[index] = inputValue
      const newValue = newValues.join('')
      
      onChange?.(newValue)

      if (inputValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      if (newValues.every(v => v !== '')) {
        onComplete?.(newValue)
      }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !values[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pastedText = e.clipboardData.getData('text')
      const pastedChars = pastedText.split('').filter(char => pattern.test(char))
      
      if (pastedChars.length > 0) {
        const newValues = [...values]
        let pasteIndex = 0
        
        for (let i = 0; i < length && pasteIndex < pastedChars.length; i++) {
          if (!newValues[i]) {
            newValues[i] = pastedChars[pasteIndex]
            pasteIndex++
          }
        }
        
        const newValue = newValues.join('')
        onChange?.(newValue)
        
        if (newValues.every(v => v !== '')) {
          onComplete?.(newValue)
        }
      }
    }

    return (
      <div
        ref={ref}
        className={cn("flex gap-2", className)}
        {...props}
      >
        {values.map((char, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={char}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            onPaste={handlePaste}
            disabled={disabled}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg border-2",
              "bg-background text-center text-2xl font-semibold",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              focusedIndex === index ? "border-primary" : "border-input",
              "transition-all",
              inputClassName
            )}
            autoComplete="one-time-code"
          />
        ))}
      </div>
    )
  }
)

VerificationCode.displayName = "VerificationCode"

export { VerificationCode }
