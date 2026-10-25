import * as React from 'react';
import { cn } from "cn";
import type { IconComponent } from '../../types';

export interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  icon?: IconComponent;
  title: string;
  as?: 'h2' | 'h3' | 'h4';
  iconClassName?: string;
}

const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ icon: Icon, title, as: Component = 'h3', iconClassName, className, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'text-base font-semibold flex items-center gap-2',
          className
        )}
        {...props}
      >
        {Icon && <Icon className={cn('h-5 w-5 text-primary', iconClassName)} />}
        {title}
      </Component>
    );
  }
);

SectionTitle.displayName = 'SectionTitle';

export { SectionTitle };
