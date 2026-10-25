import * as React from "react"
import { cn } from "cn"
import { PageContainer } from "./page-container"
import { PageHeader } from "./page-header"
import { ErrorState } from "../ui/error-state"
import { EmptyState } from "../ui/empty-state"
import { Skeleton } from "../ui/skeleton"
import { Button } from "../ui/button"
import { presetDateRange, type ReportDatePreset } from "./report-page"
import { toErrorMessage } from "../../lib/normalize-error"
import { ArrowClockwise } from '@phosphor-icons/react'

export interface OverviewPageProps {
  title: string
  /** 实体身份元信息或状态性前提，写法准入见 PAGE_HEADER_USAGE.md */
  subtitle?: string
  description?: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
  onBack?: () => void
  /** 头部右侧操作（刷新/新建/导出等，非提交类） */
  action?: React.ReactNode
  /**
   * 统计卡区插槽：标题之下、内容区之上，通常放 `<StatGrid>`（cols 规范 2/3/4/6）。
   * 仪表盘的 KPI 行 / 门户页的板块摘要卡都放这里。
   */
  summary?: React.ReactNode
  /** 内容区：图表卡、入口卡网格、双列 Card 等，由页面自组（page-taxonomy Dashboard/Portal） */
  children: React.ReactNode
  className?: string
  /**
   * 数据三态（三态由壳接管，页面禁止再手写整页 Spinner/ErrorState）：
   * - error：头部保留，ErrorState 替换 summary+children 整块（错误时 KPI 值不可信，不渲染）；
   * - loading：头部保留，概览骨架（KPI 网格 + 内容占位）替换 summary+children；
   * - isEmpty：summary 保留（0 值 KPI 是诚实数据），EmptyState 替换 children。
   */
  loading?: boolean
  error?: unknown
  /** 错误重试回调（通常接 useQueryData 的 refresh）；不传则整页 reload */
  onRetry?: () => void
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /**
   * 固定档位切换（业务概览页必备交互之一，taxonomy v1.8 自 ReportPage 吸收）：
   * 渲染在标题之下、summary 之上；days 为距今天数，范围由模板经 presetDateRange 计算。
   * 禁条件查询区（→ 查询工具页 ReportPage manual 模式专属）。
   */
  presets?: ReportDatePreset[]
  activePresetDays?: number
  onPresetChange?: (preset: ReportDatePreset, range: { start: string; end: string }) => void
  /** 常驻刷新按钮（标题行右侧；loading 时禁用） */
  onRefresh?: () => void
}

/** 概览页骨架屏：KPI 指标卡网格 + 两块内容区占位（形态对齐 ReportSkeleton） */
function OverviewSkeleton() {
  return (
    <div data-testid="overview-skeleton" className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-md" />
      <Skeleton className="h-48 rounded-md" />
    </div>
  );
}

/**
 * 业务概览页统一模板（page-taxonomy v1.8 §2.4 业务概览页唯一承载，
 * 规范见 docs/frontend/design/ENG-FE-DESIGN-004 §3.1）
 *
 * 共性骨架 = 标题通道（+时间档/刷新）→ 统计卡区（summary 槽）→ 内容区（children）。
 * 与 SettingsPage 的差异：**全宽不设 max-w**——聚合页宽度由布局层（max-w-wide）承担。
 * 三态由壳接管（loading 骨架 / error 整块替换 / empty 替换内容区，头部恒保留）；
 * 固定档位切换（presets）自 ReportPage 吸收（v1.8），条件查询区归查询工具页专属；
 * 数据获取、下钻跳转仍留在页面。
 *
 * @example 业务概览（KPI + 时间档 + 下钻）
 *   <OverviewPage title="仓库看板" loading={loading} error={error} onRetry={refresh}
 *     presets={REPORT_DATE_PRESETS} activePresetDays={activeDays}
 *     onPresetChange={(p, range) => setRange(range)} onRefresh={refresh}
 *     summary={<StatGrid cols={4}><StatCard label="在库" value={count} onClick={drill} />...</StatGrid>}>
 *     <div className="grid gap-4 md:grid-cols-2">...</div>
 *   </OverviewPage>
 *
 * @example 门户入口型（无 KPI 主体，豁免归门户页）
 *   <OverviewPage title="优惠券中心" summary={<StatGrid>...</StatGrid>}>
 *     <EntryGrid items={ENTRIES} />
 *   </OverviewPage>
 */
export function OverviewPage({
  title,
  subtitle,
  description,
  breadcrumbItems,
  onBack,
  action,
  summary,
  children,
  className,
  loading = false,
  error = null,
  onRetry,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  presets,
  activePresetDays,
  onPresetChange,
  onRefresh,
}: OverviewPageProps) {
  // error / 首载骨架替换 summary+children 整块；isEmpty 只替换 children（summary 保留）
  const renderBody = () => {
    if (error) {
      return (
        <ErrorState
          message={toErrorMessage(error)}
          onRetry={onRetry ?? (() => window.location.reload())}
        />
      );
    }
    if (loading && isEmpty) {
      return <OverviewSkeleton />;
    }
    const summaryNode = summary && <div>{summary}</div>;
    if (isEmpty) {
      return (
        <>
          {summaryNode}
          <EmptyState
            title={emptyTitle ?? `暂无${title}`}
            description={emptyDescription}
          />
        </>
      );
    }
    return (
      <>
        {summaryNode}
        {/* 刷新中已有数据：内容区降透明并禁交互（对齐 ReportPage），不做整页替换 */}
        <div className={cn(loading && 'opacity-50 pointer-events-none')}>{children}</div>
      </>
    );
  };

  return (
    <PageContainer className={cn(className)}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        description={description}
        breadcrumbItems={breadcrumbItems}
        onBack={onBack}
        action={
          onRefresh ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={onRefresh}
                disabled={loading}
                data-testid="overview-refresh"
              >
                <ArrowClockwise className="h-4 w-4" />
                刷新
              </Button>
              {action}
            </div>
          ) : (
            action
          )
        }
      />
      {presets && presets.length > 0 && onPresetChange && (
        <div className="flex items-center gap-2">
          {presets.map((p) => (
            <Button
              key={p.days}
              variant={activePresetDays === p.days ? 'default' : 'outline'}
              size="xs"
              onClick={() => onPresetChange(p, presetDateRange(p.days))}
            >
              {p.label}
            </Button>
          ))}
        </div>
      )}
      {renderBody()}
    </PageContainer>
  )
}
