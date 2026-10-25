import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { cn } from "cn";

export interface UserInfoProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
  userEmail?: string;
  showTooltip?: boolean;
  /** 只渲染头像（姓名/角色移入工作台欢迎卡后，顶栏收敛为纯头像；悬停 Tooltip 仍可见姓名/邮箱） */
  avatarOnly?: boolean;
  className?: string;
}

/**
 * 用户信息组件
 * 显示用户头像、姓名和角色
 * 所有信息在同一水平线上，字号一致
 * @param userName - 用户名
 * @param userRole - 用户角色
 * @param userAvatar - 用户头像URL
 * @param userEmail - 用户邮箱
 * @param showTooltip - 是否显示提示
 * @param avatarOnly - 只显示头像
 * @param className - 自定义类名
 */
export function UserInfo({
  userName,
  userRole,
  userAvatar = "https://github.com/shadcn.png",
  userEmail,
  showTooltip = true,
  avatarOnly = false,
  className
}: UserInfoProps) {
  const content = (
    <Button variant="ghost" className={cn("h-10 px-2", className)}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={userAvatar} alt={userName} />
        <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      {!avatarOnly && (
        <div className="ml-3 flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">{userName}</span>
          <span className="text-sm text-muted-foreground">{userRole}</span>
        </div>
      )}
    </Button>
  );

  if (!showTooltip || !userEmail) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={content} />
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{userName}</p>
            <p className="text-muted-foreground">{userEmail}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
