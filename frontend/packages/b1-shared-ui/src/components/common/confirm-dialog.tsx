import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Warning, Info, CheckCircle } from "@phosphor-icons/react";
import { cn } from "cn"

export type ConfirmVariant = 'default' | 'danger' | 'warning' | 'success'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  variant?: ConfirmVariant
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  confirmLoading?: boolean
  confirmDisabled?: boolean
  showCancel?: boolean
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: 'text-primary',
    confirmVariant: 'default' as const,
  },
  danger: {
    icon: Warning,
    iconColor: 'text-destructive',
    confirmVariant: 'destructive' as const,
  },
  warning: {
    icon: Warning,
    iconColor: 'text-warning',
    confirmVariant: 'default' as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-success',
    confirmVariant: 'default' as const,
  },
}

/**
 * 确认对话框组件
 * 用于删除、取消、保存等需要用户确认的操作
 */
const ConfirmDialog = React.forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      open,
      onOpenChange,
      title = '确认操作',
      description,
      variant = 'default',
      confirmText = '确认',
      cancelText = '取消',
      onConfirm,
      onCancel,
      confirmLoading = false,
      confirmDisabled = false,
      showCancel = true,
    },
    ref,
  ) => {
    const config = variantConfig[variant]

    const handleConfirm = React.useCallback(() => {
      onConfirm()
      onOpenChange(false)
    }, [onConfirm, onOpenChange])

    const handleCancel = React.useCallback(() => {
      onCancel?.()
      onOpenChange(false)
    }, [onCancel, onOpenChange])

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-dialog" ref={ref}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className={cn('flex-shrink-0', config.iconColor)}>
                <config.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <DialogTitle>{title}</DialogTitle>
                {description && (
                  <DialogDescription className="mt-2">{description}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            {showCancel && (
              <Button variant="outline" onClick={handleCancel}>
                {cancelText}
              </Button>
            )}
            <Button
              variant={config.confirmVariant}
              onClick={handleConfirm}
              disabled={confirmDisabled || confirmLoading}
            >
              {confirmLoading ? '处理中...' : confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
)

ConfirmDialog.displayName = 'ConfirmDialog'

export { ConfirmDialog }
