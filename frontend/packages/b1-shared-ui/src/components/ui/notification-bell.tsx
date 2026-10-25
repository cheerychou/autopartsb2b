import { useState } from "react";
import { Envelope } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "./dropdown-menu";
import { cn } from "cn";

export interface NotificationItem {
  id: string;
  title: string;
  category: string;
  time: string;
  unread: boolean;
}

interface NotificationBellProps {
  notifications: NotificationItem[];
  className?: string;
  /** 「查看全部」回调（如跳转通知中心页）；提供时在下拉尾部渲染入口 */
  onViewAll?: () => void;
}

/**
 * 通知铃铛下拉菜单组件
 * @param notifications - 通知数据列表
 */
export function NotificationBell({ notifications, className, onViewAll }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => n.unread).length;
  const filtered = notifications.filter((n) =>
    filter === "all" ? true : n.unread
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            className={cn("relative rounded-full p-2 hover:bg-muted", className)}
            aria-label="通知"
          />
        }
      >
        {/* 消息语义用信封（2026-10-18 用户定名）：铃铛偏「提醒」，信封才是「消息」
            尺寸对齐顶栏其他图标（16px），笔画绝对粗细随尺寸缩放，20px 会显粗 */}
        <Envelope size={16} weight="bold" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-destructive" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>通知</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex gap-2 p-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1 text-sm rounded-md",
              filter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            全部
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "px-3 py-1 text-sm rounded-md",
              filter === "unread" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            未读
          </button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{notification.title}</span>
                  {notification.unread && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span>{notification.category}</span>
                  <span>{notification.time}</span>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              暂无通知
            </div>
          )}
        </div>
        {onViewAll && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-sm text-primary"
              onSelect={() => onViewAll()}
            >
              查看全部通知
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
