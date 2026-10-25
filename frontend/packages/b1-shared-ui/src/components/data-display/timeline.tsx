import * as React from 'react';
import { cn } from "cn";

export type TimelineMode = 'left' | 'right' | 'alternate';

export interface TimelineItemProps {
  key?: string;
  color?: string;
  dot?: React.ReactNode;
  label?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  pending?: boolean;
}

export interface TimelineProps {
  items?: TimelineItemProps[];
  reverse?: boolean;
  pending?: boolean;
  pendingDot?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(
  ({ color, dot, label, children, className, pending, ...props }, ref) => {
    return (
      <li ref={ref} className={cn('relative', className)} {...props}>
        <div className="flex gap-4">
          {label && (
            <div className="flex-shrink-0 w-24 text-right text-sm text-muted-foreground">
              {label}
            </div>
          )}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                'w-3 h-3 rounded-full border-2 border-background',
                pending && 'animate-pulse'
              )}
              style={{
                backgroundColor: color || pending ? '#94a3b8' : '#3b82f6',
                borderColor: pending ? '#94a3b8' : '#3b82f6'
              }}
            >
              {dot && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {dot}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 pb-8">
            {children}
          </div>
        </div>
      </li>
    );
  }
);

TimelineItem.displayName = 'TimelineItem';

const Timeline = React.forwardRef<HTMLUListElement, TimelineProps>(
  ({
    items,
    reverse = false,
    pending = false,
    pendingDot,
    className,
    children,
    ...props
  }, ref) => {
    const renderItems = () => {
      if (items && items.length > 0) {
        return items.map((item, index) => (
          <TimelineItem
            key={item.key || String(index)}
            color={item.color}
            dot={item.dot}
            label={item.label}
            className={item.className}
            pending={item.pending}
          >
            {item.children}
          </TimelineItem>
        ));
      }
      return children;
    };

    const renderContent = () => {
      const content = renderItems();
      
      if (pending) {
        return React.Children.toArray(content).concat(
          <TimelineItem
            key="pending"
            pending
            dot={pendingDot}
          >
            <div className="text-muted-foreground">加载中...</div>
          </TimelineItem>
        );
      }
      
      return content;
    };

    const finalContent = renderContent();
    const displayContent = reverse ? React.Children.toArray(finalContent).reverse() : finalContent;

    return (
      <ul
        ref={ref}
        className={cn('space-y-0', className)}
        {...props}
      >
        {displayContent}
      </ul>
    );
  }
);

Timeline.displayName = 'Timeline';

export { Timeline, TimelineItem };
