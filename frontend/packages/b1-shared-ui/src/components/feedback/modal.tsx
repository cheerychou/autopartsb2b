import * as React from 'react';
import { cn } from "cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { ArrowsOut, ArrowsIn } from "@phosphor-icons/react";

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  showMaximize?: boolean;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  draggable?: boolean;
  contentClassName?: string;
  width?: string | number;
  height?: string | number;
  maxWidth?: string;
  maxHeight?: string;
  maskClosable?: boolean;
  keyboard?: boolean;
}

const EnhancedModal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({
    open = false,
    onOpenChange,
    title,
    description,
    children,
    footer,
    showMaximize = false,
    fullscreen = false,
    onFullscreenChange,
    draggable = false,
    contentClassName,
    width,
    height,
    maxWidth = '90vw',
    maxHeight = '90vh',
    maskClosable = true,
    keyboard = true,
    ...props
  }, _ref) => {
    const [isFullscreen, setIsFullscreen] = React.useState(fullscreen);
    const [isDragging, setIsDragging] = React.useState(false);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      setIsFullscreen(fullscreen);
    }, [fullscreen]);

    const handleFullscreen = () => {
      const newFullscreen = !isFullscreen;
      setIsFullscreen(newFullscreen);
      onFullscreenChange?.(newFullscreen);
      if (newFullscreen) {
        setPosition({ x: 0, y: 0 });
      }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!draggable || isFullscreen || !contentRef.current) return;
      
      const header = contentRef.current.querySelector('[data-modal-header]');
      if (!header || !header.contains(e.target as Node)) return;

      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    };

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, dragOffset]);

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (keyboard && e.key === 'Escape' && open) {
          onOpenChange?.(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [keyboard, open, onOpenChange]);

    const contentStyle: React.CSSProperties = {
      width: isFullscreen ? '100vw' : width,
      height: isFullscreen ? '100vh' : height,
      maxWidth: isFullscreen ? '100vw' : maxWidth,
      maxHeight: isFullscreen ? '100vh' : maxHeight,
      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
      borderRadius: isFullscreen ? 0 : undefined,
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal={!maskClosable}>
        <DialogContent
          ref={contentRef}
          className={cn(
            'relative',
            isDragging && 'cursor-move',
            contentClassName
          )}
          style={contentStyle}
          onMouseDown={handleMouseDown}
          {...props}
        >
          {(title || showMaximize) && (
            <DialogHeader data-modal-header className="flex flex-row items-center justify-between gap-4">
              <div className="flex-1">
                {title && <DialogTitle>{title}</DialogTitle>}
                {description && <DialogDescription>{description}</DialogDescription>}
              </div>
              <div className="flex items-center gap-2">
                {showMaximize && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleFullscreen}
                    aria-label={isFullscreen ? '退出全屏' : '全屏'}
                  >
                    {isFullscreen ? (
                      <ArrowsIn className="h-4 w-4" />
                    ) : (
                      <ArrowsOut className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </DialogHeader>
          )}
          
          <div className="flex-1 overflow-auto">
            {children}
          </div>

          {footer && (
            <DialogFooter>
              {footer}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

EnhancedModal.displayName = 'EnhancedModal';

export { EnhancedModal as Modal };
