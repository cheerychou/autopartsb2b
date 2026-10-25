import * as React from "react"
import { X } from "@phosphor-icons/react";
import { cn } from "cn"

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type ModalPosition = 'center' | 'top' | 'bottom'

export interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: ModalSize
  position?: ModalPosition
  closeable?: boolean
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
  showCloseButton?: boolean
  className?: string
  overlayClassName?: string
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
  id?: string
}

/**
 * 模态框组件
 * 比 Dialog 更灵活，支持自定义尺寸、位置
 */
const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    open = false,
    onOpenChange,
    title,
    description,
    children,
    footer,
    size = 'md',
    position = 'center',
    closeable = true,
    closeOnOverlayClick = true,
    closeOnEsc = true,
    showCloseButton = true,
    className,
    overlayClassName,
    contentClassName,
    headerClassName,
    bodyClassName,
    footerClassName,
    id,
    ...props 
  }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(open)
    const modalRef = React.useRef<HTMLDivElement>(null)
    const previousActiveElement = React.useRef<HTMLElement | null>(null)

    const isOpen = open !== undefined ? open : internalOpen

    const handleOpenChange = (newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    }

    const handleClose = () => {
      if (closeable) {
        handleOpenChange(false)
      }
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && closeOnOverlayClick) {
        handleClose()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc && closeable) {
        handleClose()
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
          
          if (document.activeElement === lastElement) {
            firstElement.focus()
          } else {
            lastElement.focus()
          }
        }
      }
    }

    React.useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement as HTMLElement
        document.body.style.overflow = 'hidden'
        if (modalRef.current) {
          modalRef.current.focus()
        }
      } else {
        document.body.style.overflow = ''
        if (previousActiveElement.current) {
          previousActiveElement.current.focus()
        }
      }

      return () => {
        document.body.style.overflow = ''
      }
    }, [isOpen])

    if (!isOpen) {
      return null
    }

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-detail',
      full: 'max-w-full m-4'
    }

    const positionClasses = {
      center: 'items-center justify-center',
      top: 'items-start justify-center pt-16',
      bottom: 'items-end justify-center pb-16'
    }

    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm transition-opacity",
          positionClasses[position],
          overlayClassName
        )}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id}-title` : undefined}
        aria-describedby={description ? `${id}-description` : undefined}
      >
        <div
          ref={ref}
          className={cn(
            "relative w-full rounded-lg bg-background shadow-lg transition-all",
            sizeClasses[size],
            size === 'full' ? 'h-[calc(100vh-2rem)]' : 'max-h-[calc(100vh-2rem)] overflow-hidden',
            contentClassName,
            className
          )}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          {...props}
        >
          {(title || showCloseButton) && (
            <div className={cn("flex items-center justify-between border-b p-6", headerClassName)}>
              <div className="flex-1">
                {title && (
                  <h2 id={`${id}-title`} className="text-lg font-semibold">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={`${id}-description`} className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && closeable && (
                <button
                  type="button"
                  onClick={handleClose}
                  className={cn(
                    "ml-4 flex h-8 w-8 items-center justify-center rounded-md",
                    "text-muted-foreground hover:bg-muted hover:text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className={cn("overflow-y-auto p-6", bodyClassName)}>
            {children}
          </div>

          {footer && (
            <div className={cn("flex items-center justify-end gap-2 border-t p-6", footerClassName)}>
              {footer}
            </div>
          )}
        </div>
      </div>
    )
  }
)

Modal.displayName = "Modal"

export { Modal }
