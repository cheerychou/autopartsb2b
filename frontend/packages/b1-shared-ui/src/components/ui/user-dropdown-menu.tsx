import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "./dropdown-menu";
import { UserInfo } from "./user-info";
import { Icons } from "./icons";

interface UserDropdownMenuProps {
  userName: string;
  userRole: string;
  userEmail?: string;
  onLogout: () => void;
  /** 只显示头像（姓名/角色移入工作台欢迎卡后的顶栏收敛形态，2026-10-18 门户改版） */
  avatarOnly?: boolean;
  /** 点击"个人资料"回调（跳转个人信息页） */
  onProfile?: () => void;
  /** 点击"修改密码"回调（跳转修改密码页） */
  onPasswordChange?: () => void;
  /** 点击"偏好设置"回调 */
  onPreferences?: () => void;
}

/**
 * 用户下拉菜单组件
 * @param userName - 用户名
 * @param userRole - 用户角色
 * @param userEmail - 用户邮箱
 * @param onLogout - 退出登录回调
 * @param avatarOnly - 只显示头像
 * @param onProfile - 点击"个人资料"回调
 * @param onPasswordChange - 点击"修改密码"回调
 * @param onPreferences - 点击"偏好设置"回调
 */
export function UserDropdownMenu({
  userName,
  userRole,
  userEmail,
  onLogout,
  avatarOnly,
  onProfile,
  onPasswordChange,
  onPreferences,
}: UserDropdownMenuProps) {
  return (
    <DropdownMenu>
      {/* 内部 UserInfo 的 Tooltip trigger 是原生 button，外层须为非 button 元素避免嵌套；nativeButton={false} 显式声明此语义 */}
      <DropdownMenuTrigger
        render={
          <div
            className="flex items-center gap-2 rounded-full hover:bg-muted px-2 py-1 cursor-pointer min-h-[44px] min-w-[44px]"
            role="button"
            tabIndex={0}
          />
        }
        nativeButton={false}
      >
        <UserInfo
          userName={userName}
          userRole={userRole}
          userEmail={userEmail}
          avatarOnly={avatarOnly}
          className="hidden md:flex"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>我的账户</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfile}>
          <Icons.User size={16} className="shrink-0 text-muted-foreground" />
          个人资料
        </DropdownMenuItem>
        {onPasswordChange && (
          <DropdownMenuItem onClick={onPasswordChange}>
            <Icons.Password size={16} className="shrink-0 text-muted-foreground" />
            修改密码
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onPreferences}>
          <Icons.Settings size={16} className="shrink-0 text-muted-foreground" />
          偏好设置
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={onLogout}>
          <Icons.Logout size={16} className="shrink-0" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
