import { cn } from 'cn';
import { StatCard } from './stat-card';

/**
 * 指标卡网格——中台 RealTimeMetric[] 的统一渲染件（EA-DA-012 §6.3 指标组件族）。
 *
 * 数据契约：数组元素为指标中台读面（/metrics/kpi、/metrics/board/{code}）
 * 出参经 http 层 snake→camel 后的形状；数值/单位/趋势方向与变化率全部来自
 * 中台读数，组件不携带指标元数据（保持纯净可移植）。
 * - trend 缺失（前置窗口无数据）显示占位符；
 * - 占位指标（compute 恒 0）正常渲染 0 值，title 带指标名可溯源；
 * - 列数契约对齐 StatGrid（2026-09-27 拍板）：仅 2/3/4/6 列，超 4 张用两行四列。
 */

/** 指标卡数据项（中台 RealTimeMetric 的消费侧最小结构） */
export interface MetricCardItem {
  /** 指标码（React key） */
  id: string;
  /** 指标名 */
  name: string;
  /** 当前值 */
  currentValue: number;
  /** 单位（缺省不渲染） */
  unit?: string;
  /**
   * 趋势方向（缺省按 flat 处理）。声明为 string：中台出参为 up/down/flat，
   * 消费方存量类型（如 store-web 旧 TrendDirection）用 'stable' 词汇——
   * 非 up/down 一律按 flat 渲染，不在类型层互斥。
   */
  trend?: string;
  /** 变化率（百分比，正数带 + 前缀） */
  changeRate?: number;
  /** 上期值（null/undefined 时副行不渲染） */
  previousValue?: number | null;
}

export interface MetricCardGridProps {
  metrics: MetricCardItem[] | undefined;
  loading?: boolean;
  /** 桌面列数（对齐 StatGrid 栅格契约 2/3/4/6），默认 4 */
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

const COLS: Record<NonNullable<MetricCardGridProps['columns']>, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  6: 'md:grid-cols-6',
};

export function MetricCardGrid({ metrics, loading, columns = 4, className }: MetricCardGridProps) {
  if (!metrics?.length) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="text-sm text-muted-foreground">暂无指标数据</div>
      </div>
    );
  }
  return (
    <div className={cn('grid grid-cols-2 gap-4', COLS[columns], className)}>
      {metrics.map((m) => (
        <StatCard
          key={m.id}
          label={m.name}
          value={m.currentValue}
          unit={m.unit || undefined}
          trend={{
            direction:
              m.trend === 'up' ? 'up' : m.trend === 'down' ? 'down' : 'flat',
            value: `${(m.changeRate ?? 0) > 0 ? '+' : ''}${m.changeRate ?? 0}%`,
          }}
          subtitle={
            m.previousValue != null ? `上期: ${m.previousValue.toLocaleString()}` : undefined
          }
          loading={loading}
        />
      ))}
    </div>
  );
}
