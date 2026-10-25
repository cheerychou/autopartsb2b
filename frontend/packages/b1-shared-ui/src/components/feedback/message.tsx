import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle, XCircle, WarningCircle, Info, X } from "@phosphor-icons/react";
import { cn } from "cn";
import { Button } from '../ui/button';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface MessageProps {
  type?: MessageType;
  content: string;
  duration?: number;
  onClose?: () => void;
  showClose?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({
    type = 'info',
    content,
    duration,
    onClose,
    showClose = true,
    className,
    style,
    ...props
  }, ref) => {
    const [visible, setVisible] = React.useState(true);

    const handleClose = () => {
      setVisible(false);
      onClose?.();
    };

    React.useEffect(() => {
      if (duration && duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, handleClose]);

    if (!visible) return null;

    const icons = {
      success: <CheckCircle className="h-5 w-5 text-success" />,
      error: <XCircle className="h-5 w-5 text-destructive" />,
      warning: <WarningCircle className="h-5 w-5 text-warning" />,
      info: <Info className="h-5 w-5 text-primary" />,
    };

    const colors = {
      success: 'border-success bg-success-soft',
      error: 'border-destructive bg-destructive-soft',
      warning: 'border-warning bg-warning-soft',
      info: 'border-primary bg-primary/10',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-md transition-all duration-slow',
          colors[type],
          className
        )}
        style={style}
        {...props}
      >
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{content}</p>
        </div>
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleClose}
            aria-label="关闭消息"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);

Message.displayName = 'Message';

interface MessageInstance {
  success: (content: string, duration?: number) => void;
  error: (content: string, duration?: number) => void;
  warning: (content: string, duration?: number) => void;
  info: (content: string, duration?: number) => void;
}

let messageContainer: HTMLDivElement | null = null;

const createContainer = () => {
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
    document.body.appendChild(messageContainer);
  }
  return messageContainer;
};

const showMessage = (type: MessageType, content: string, duration = 3000) => {
  const container = createContainer();
  const messageElement = document.createElement('div');
  container.appendChild(messageElement);

  const root = createRoot(messageElement);
  
  const handleClose = () => {
    root.unmount();
    if (container.contains(messageElement)) {
      container.removeChild(messageElement);
    }
    if (container.children.length === 0) {
      document.body.removeChild(container);
      messageContainer = null;
    }
  };

  root.render(
    <Message
      type={type}
      content={content}
      duration={duration}
      onClose={handleClose}
    />
  );
};

const message: MessageInstance = {
  success: (content: string, duration?: number) => showMessage('success', content, duration),
  error: (content: string, duration?: number) => showMessage('error', content, duration),
  warning: (content: string, duration?: number) => showMessage('warning', content, duration),
  info: (content: string, duration?: number) => showMessage('info', content, duration),
};

export { Message, message };
