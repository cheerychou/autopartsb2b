import * as React from 'react';
import { cn } from 'cn';
import { TrendUpIcon, TrendDownIcon, MinusIcon } from '@phosphor-icons/react';
import { Skeleton } from '../ui/skeleton';

/**
 * 统计卡（指标摘要方块）——图标 + 大数字 + 小标签 + 可选状态灯的统一组件。
 *
 * 设计约定（统计卡共享组件统一方案；状态灯修订 2026-09-26 拍板；
 * 磁贴收编专项扩展 2026-09-29 拍板：状态灯补绿档 + 新增 footer 底部槽）：
 * - 白卡为唯一形态，无 variant；
 * - 职责分离：图标底座固定中性色（装饰）、数字统一前景色（事实，不允许彩色数字，
 *   存量彩色数字语义一律降级为状态灯或副行文字）、状态灯专职语义；
 * - status 词汇跟随 StatusTone 子集：'success' | 'warning' | 'danger' 三值
 *   （2026-09-29 起补齐绿档：达标/正常等正向语义可亮绿灯；中性态不传 status 不亮灯）；
 * - footer 底部槽：可选 ReactNode（进度条、补充行等），渲染于副行之下的卡内底部；
 * - 可点语义仅在实际传入 onClick 时启用（修复存量"无条件 cursor-pointer"的假可点问题）；
 *   可点卡根元素渲染为原生 button（天然获得焦点/Enter/Space 触发，键盘可达），
 *   纯展示卡保持 div——button 内不得嵌套交互元素（footer 槽内容注意此约束）。
 */

/** 状态灯语义（整卡结果态）。词汇取 StatusTone 子集 */
export type StatStatus = 'success' | 'warning' | 'danger';

/** 趋势标注：direction 控制箭头方向与颜色 */
export interface StatTrend {
  direction: 'up' | 'down' | 'flat';
  value?: React.ReactNode;
}

export interface StatCardProps {
  /** 指标名称 */
  label: string;
  /** 指标值：number 自动千分位（zh-CN），或直接传 ReactNode/已格式化字符串 */
  value: React.ReactNode;
  /** 单位，渲染在数值右侧小字 */
  unit?: string;
  /** 辅助说明行（如"较上周 +12%"的补充描述） */
  subtitle?: React.ReactNode;
  /** 图标组件（Icons 语义注册表或 @phosphor-icons/react），仅装饰，底座固定中性色 */
  icon?: React.ComponentType<{ className?: string; size?: number | string }>;
  /** 图标底座：'soft' 中性色块（默认）| 'plain' 裸图标（muted）| 'none' 不渲染 */
  iconVariant?: 'soft' | 'plain' | 'none';
  /**
   * 状态灯：数字右侧圆点（success=绿"正常/达标"，warning=黄"需关注"，danger=红"危险"）。
   * 中性态不传——不亮灯。
   */
  status?: StatStatus;
  /** 趋势标注（渲染于数值下方小字行） */
  trend?: StatTrend;
  /** 底部自定义槽：进度条、补充说明行等任意内容，渲染于卡内最底部（磁贴收编 2026-09-29 新增） */
  footer?: React.ReactNode;
  /** 加载态骨架 */
  loading?: boolean;
  /** 提供时才有可点语义（cursor-pointer / hover 阴影 / 聚焦环） */
  onClick?: () => void;
  className?: string;
}

/** 状态灯：专职语义载体（颜色-数字物理绑定），图形元素不受文字对比度约束 */
const STATUS_META: Record<StatStatus, { label: string; dotClass: string }> = {
  success: { label: '正常', dotClass: 'bg-success' },
  warning: { label: '需关注', dotClass: 'bg-warning' },
  danger: { label: '危险', dotClass: 'bg-destructive' },
};

const TREND_META: Record<StatTrend['direction'], { Icon: React.ComponentType<{ className?: string }>; className: string }> = {
  up: { Icon: TrendUpIcon, className: 'text-success' },
  down: { Icon: TrendDownIcon, className: 'text-destructive' },
  flat: { Icon: MinusIcon, className: 'text-muted-foreground' },
};

/** 加载骨架：布局与真实卡对齐（label 行 / 数值行 / 辅助行） */
function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div data-testid="stat-card-skeleton" className={cn('rounded-lg border bg-card p-4', className)}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-2 h-8 w-24" />
      <Skeleton className="mt-2 h-3 w-16" />
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  subtitle,
  icon: Icon,
  iconVariant = 'soft',
  status,
  trend,
  footer,
  loading = false,
  onClick,
  className,
}: StatCardProps) {
  if (loading) {
    return <StatCardSkeleton className={className} />;
  }

  const showFooter = Boolean(subtitle) || Boolean(trend);
  const statusMeta = status ? STATUS_META[status] : undefined;
  // 可点 → 原生 button（键盘可达：tabIndex/Enter/Space 免费获得）；纯展示 → div。
  // button 浏览器默认居中/加粗，用 w-full text-left font-normal 归位。
  const clickable = typeof onClick === 'function';
  const Comp: 'button' | 'div' = clickable ? 'button' : 'div';

  return (
    <Comp
      {...(clickable ? { type: 'button' as const } : {})}
      data-testid="stat-card"
      className={cn(
        'rounded-lg border bg-card p-4 text-left transition-shadow',
        clickable &&
          'block w-full cursor-pointer font-normal hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && iconVariant === 'soft' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon size={20} />
          </div>
        )}
        {Icon && iconVariant === 'plain' && <Icon size={20} className="text-muted-foreground" />}
      </div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {typeof value === 'number' ? value.toLocaleString('zh-CN') : value}
        </span>
        {statusMeta && (
          <span
            data-testid="stat-status-dot"
            role="status"
            title={statusMeta.label}
            aria-label={statusMeta.label}
            className={cn('self-center inline-block h-2 w-2 shrink-0 rounded-full', statusMeta.dotClass)}
          />
        )}
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>

      {showFooter && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {trend && <StatTrendIndicator trend={trend} />}
          {subtitle}
        </div>
      )}

      {footer && <div className="mt-2">{footer}</div>}
    </Comp>
  );
}

function StatTrendIndicator({ trend }: { trend: StatTrend }) {
  const { Icon, className } = TREND_META[trend.direction];
  return (
    <span data-testid="stat-trend" className={cn('inline-flex items-center gap-0.5 font-medium', className)}>
      <Icon className="h-3.5 w-3.5" />
      {trend.value}
    </span>
  );
}

export interface StatGridProps {
  /**
   * 桌面列数（md 断点起生效）：默认 4，对齐 ReportPage 骨架 md:grid-cols-4。
   * 规范（2026-09-27 拍板）：统计卡行只允许 2/3/4/6 列——一行最多 4 张卡，
   * 5 列已从契约移除（超出四列栅格规范），统计行超 4 张时用 8 张（两行四列）。
   */
  cols?: 2 | 3 | 4 | 6;
  children: React.ReactNode;
  className?: string;
}

const COLS_CLASS: Record<NonNullable<StatGridProps['cols']>, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  6: 'md:grid-cols-6',
};

/** 统计卡网格：移动端统一 2 列（对齐 ReportPage 骨架 grid-cols-2） */
export function StatGrid({ cols = 4, children, className }: StatGridProps) {
  return (
    <div data-testid="stat-grid" className={cn('grid grid-cols-2 gap-4', COLS_CLASS[cols], className)}>
      {children}
    </div>
  );
}
