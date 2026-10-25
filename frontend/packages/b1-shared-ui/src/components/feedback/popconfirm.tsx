import * as React from 'react';
import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Warning } from "@phosphor-icons/react";

export interface PopconfirmProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ComponentProps<typeof Button>;
  cancelButtonProps?: React.ComponentProps<typeof Button>;
  disabled?: boolean;
  showIcon?: boolean;
  icon?: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  className?: string;
}

const Popconfirm = React.forwardRef<HTMLDivElement, PopconfirmProps>(
  ({
    children,
    title = '确认操作',
    description,
    onConfirm,
    onCancel,
    okText = '确定',
    cancelText = '取消',
    okButtonProps,
    cancelButtonProps,
    disabled = false,
    showIcon = true,
    icon,
    placement = 'top',
    className,
    ...props
  }, ref) => {
    const [open, setOpen] = React.useState(false);

    const handleConfirm = () => {
      onConfirm?.();
      setOpen(false);
    };

    const handleCancel = () => {
      onCancel?.();
      setOpen(false);
    };

    const defaultIcon = <Warning className="h-5 w-5 text-warning" />;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={children as React.ReactElement} />
        <PopoverContent
          ref={ref}
          className={cn('w-80 p-4', className)}
          side={placement.includes('top') ? 'top' : placement.includes('bottom') ? 'bottom' : placement.includes('left') ? 'left' : 'right'}
          align={placement.includes('start') ? 'start' : placement.includes('end') ? 'end' : 'center'}
          {...props}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {showIcon && (
                <div className="flex-shrink-0">
                  {icon || defaultIcon}
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-sm font-semibold">{title}</h4>
                {description && (
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
               
                onClick={handleCancel}
                {...cancelButtonProps}
              >
                {cancelText}
              </Button>
              <Button
                variant="default"
               
                onClick={handleConfirm}
                {...okButtonProps}
              >
                {okText}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

Popconfirm.displayName = 'Popconfirm';

export { Popconfirm };
