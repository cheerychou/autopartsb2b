import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from "@phosphor-icons/react";
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from "cn";
import { Button } from '../ui/button';

export type DrawerPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface DrawerProps extends VariantProps<typeof drawerVariants> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  placement?: DrawerPlacement;
  width?: string | number;
  height?: string | number;
  mask?: boolean;
  maskClosable?: boolean;
  closable?: boolean;
  contentClassName?: string;
  style?: React.CSSProperties;
}

const drawerVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-open:animate-in data-closed:animate-out data-closed:duration-slow data-open:duration-slow",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-closed:slide-out-to-top data-open:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-closed:slide-out-to-bottom data-open:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full border-r data-closed:slide-out-to-left data-open:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full border-l data-closed:slide-out-to-right data-open:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

/**
 * 通用抽屉组件
 * 基于 Base UI Dialog 实现，使用标准的 animate-in/out 动画体系
 */
const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  ({
    open = false,
    onOpenChange,
    onClose,
    title,
    children,
    footer,
    placement = 'right',
    width,
    height,
    mask = true,
    maskClosable = true,
    closable = true,
    contentClassName,
    style,
  }, ref) => {
    const handleOpenChange = React.useCallback(
      (value: boolean) => {
        onOpenChange?.(value);
        if (!value) {
          onClose?.();
        }
      },
      [onOpenChange, onClose]
    );

    const sideStyle = React.useMemo((): React.CSSProperties => {
      if (placement === 'top' || placement === 'bottom') {
        if (height) return { height: typeof height === 'number' ? `${height}px` : height };
      }
      if (placement === 'left' || placement === 'right') {
        if (width) return { width: typeof width === 'number' ? `${width}px` : width };
      }
      return {};
    }, [placement, width, height]);

    return (
      <DialogPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        disablePointerDismissal={!maskClosable}
      >
        {mask && (
          <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop
              className={cn(
                "fixed inset-0 z-50 bg-black/80 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
                !maskClosable && "pointer-events-none"
              )}
            />
          </DialogPrimitive.Portal>
        )}
        <DialogPrimitive.Portal>
          <DialogPrimitive.Popup
            ref={ref}
            className={cn(
              drawerVariants({ side: placement }),
              "flex flex-col",
              contentClassName
            )}
            style={{ ...sideStyle, ...style }}
          >
            {(title || closable) && (
              <div className="flex items-center justify-between border-b pb-4">
                {title && (
                  <DialogPrimitive.Title className="text-lg font-semibold">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {closable && (
                  <DialogPrimitive.Close
                    render={
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="关闭" />
                    }
                  >
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                )}
              </div>
            )}

            <div className="flex-1 overflow-auto py-4">
              {children}
            </div>

            {footer && (
              <div className="border-t pt-4">
                {footer}
              </div>
            )}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);

Drawer.displayName = 'Drawer';

export { Drawer, drawerVariants };
