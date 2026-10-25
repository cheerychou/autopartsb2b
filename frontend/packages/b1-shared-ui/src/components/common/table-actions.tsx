import type { MouseEvent } from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Icons } from '../ui/icons';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  className?: string;
  disabled?: boolean;
}

export interface MoreMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  disabled?: boolean;
  danger?: boolean;
}

export interface TableActionsProps {
  fixedActions?: ActionItem[];
  primaryAction?: ActionItem;
  moreMenu?: {
    label?: string;
    items: MoreMenuItem[];
  };
  onClick?: (e: MouseEvent) => void;
}

export function TableActions({
  fixedActions = [],
  primaryAction,
  moreMenu,
  onClick,
}: TableActionsProps) {
  const stopProp = (e: MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const renderButton = (action: ActionItem) => {
    if (action.href) {
      return (
        <a href={action.href} data-discover="true">
          <Button
            variant={action.variant || 'outline'}
            className={action.className}
            disabled={action.disabled}
          >
            {action.icon && <span className="mr-1">{action.icon}</span>}
            {action.label}
          </Button>
        </a>
      );
    }

    return (
      <Button
        variant={action.variant || 'outline'}
        className={action.className}
        disabled={action.disabled}
        onClick={action.onClick}
      >
        {action.icon && <span className="mr-1">{action.icon}</span>}
        {action.label}
      </Button>
    );
  };

  return (
    <div className="flex items-center gap-2" onClick={stopProp}>
      {fixedActions.map((action) => (
        <div key={action.label}>
          {renderButton(action)}
        </div>
      ))}

      {primaryAction && renderButton(primaryAction)}

      {moreMenu && moreMenu.items.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 w-8 p-0"
          >
            <span className="sr-only">打开菜单</span>
            <Icons.More className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {moreMenu.label && <DropdownMenuLabel>{moreMenu.label}</DropdownMenuLabel>}
            {moreMenu.label && <DropdownMenuSeparator />}
            {moreMenu.items.map((item) => (
              <DropdownMenuItem
                key={item.label}
                className={item.className || (item.danger ? 'text-destructive' : '')}
                onClick={item.onClick}
                disabled={item.disabled}
              >
                {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
