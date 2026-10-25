import * as React from "react"
import { X } from "@phosphor-icons/react";
import { cn } from "cn"

export type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type TagSize = 'sm' | 'md' | 'lg'

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant
  size?: TagSize
  closable?: boolean
  onClose?: () => void
  icon?: React.ReactNode
  className?: string
}

/**
 * 标签组件
 * 支持关闭、可编辑、多种样式
 */
const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ 
    variant = 'default',
    size = 'md',
    closable = false,
    onClose,
    icon,
    className,
    children,
    ...props 
  }, ref) => {
    const handleClose = (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose?.()
    }

    const variantStyles = {
      default: 'bg-muted text-muted-foreground hover:bg-muted/80',
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      success: 'bg-success text-white hover:bg-success',
      warning: 'bg-warning text-white hover:bg-warning',
      danger: 'bg-destructive text-white hover:bg-destructive',
      info: 'bg-primary text-white hover:bg-primary'
    }

    const sizeStyles = {
      sm: 'h-6 px-2 text-xs',
      md: 'h-7 px-2.5 text-sm',
      lg: 'h-8 px-3 text-base'
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1">{children}</span>
        {closable && (
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "flex-shrink-0 rounded-full p-0.5",
              "hover:bg-black/10",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            aria-label="关闭标签"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    )
  }
)

Tag.displayName = "Tag"

export { Tag }

export interface CheckableTagProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange'> {
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

/**
 * 可选中标签
 */
export function CheckableTag({ 
  checked = false, 
  onChange, 
  className, 
  children,
  ...props 
}: CheckableTagProps) {
  const handleClick = () => {
    onChange?.(!checked)
  }

  return (
    <span
      onClick={handleClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        "hover:border-primary hover:bg-primary/5",
        checked 
          ? "border-primary bg-primary text-primary-foreground" 
          : "border-border bg-background text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export interface EditableTagProps {
  value?: string
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  onCancel?: () => void
  variant?: TagVariant
  size?: TagSize
  className?: string
}

/**
 * 可编辑标签
 */
export function EditableTag({ 
  value = '', 
  onChange, 
  onSave,
  onCancel,
  variant = 'default',
  size = 'md',
  className 
}: EditableTagProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(value)
  const [prevValue, setPrevValue] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // prop 变化时同步编辑值（render 期间调整，避免 effect 中 setState）
  if (value !== prevValue) {
    setPrevValue(value)
    setEditValue(value)
  }

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    setIsEditing(false)
    if (editValue.trim() !== value) {
      onChange?.(editValue.trim())
      onSave?.(editValue.trim())
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
      />
    )
  }

  return (
    <Tag 
      variant={variant} 
      size={size} 
      closable={false} 
      onClick={handleEdit}
      className={cn("cursor-pointer", className)}
    >
      {value}
    </Tag>
  )
}

export interface TagGroupProps {
  value?: string[]
  onChange?: (value: string[]) => void
  options?: Array<{ label: string; value: string }>
  variant?: TagVariant
  size?: TagSize
  closable?: boolean
  className?: string
}

/**
 * 标签组
 */
export function TagGroup({ 
  value = [], 
  onChange, 
  options = [],
  variant = 'default',
  size = 'md',
  closable = true,
  className 
}: TagGroupProps) {
  const handleRemove = (tagValue: string) => {
    const newValue = value.filter(v => v !== tagValue)
    onChange?.(newValue)
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {value.map((tagValue) => {
        const option = options.find(opt => opt.value === tagValue)
        return (
          <Tag
            key={tagValue}
            variant={variant}
            size={size}
            closable={closable}
            onClose={() => handleRemove(tagValue)}
          >
            {option?.label || tagValue}
          </Tag>
        )
      })}
    </div>
  )
}
