import * as React from 'react';
// 直接从兄弟组件源文件导入，不经过包出口 index.ts，避免 index ↔ report-page 循环引用
// （循环在生产分包后导致 chunk 间循环依赖、ESM 初始化顺序损坏、React undefined 白屏）。
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ErrorState } from '../ui/error-state';
import { EmptyState } from '../ui/empty-state';
import { SimpleBreadcrumb } from '../ui/breadcrumb';
import { PageContainer } from './page-container';
import { SearchForm, type SearchFormField, type SearchFormValues } from './search-form';
import { cn } from "cn";
import { Skeleton } from '../ui/skeleton';
import { toErrorMessage } from '../../lib/normalize-error';
import { ArrowClockwise } from '@phosphor-icons/react';

/** 快捷时间档定义（days 为距今天数，范围由模板计算） */
export interface ReportDatePreset {
  label: string;
  days: number;
}

/** 全站通用快捷时间档（报表页默认引入，特殊域可自定义） */
export const REPORT_DATE_PRESETS: ReportDatePreset[] = [
  { label: '近 7 天', days: 7 },
  { label: '近 30 天', days: 30 },
  { label: '近 90 天', days: 90 },
];

/** 由 days 计算 YYYY-MM-DD 日期范围（含今天） */
export function presetDateRange(days: number): { start: string; end: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
  return { start: fmt(start), end: fmt(end) };
}

export interface ReportPageProps {
  title: string;
  description?: string;
  breadcrumb?: string[];

  /**
   * 筛选字段配置（SearchForm 协议，支持 input/select/dateRange）。
   * 省略时筛选卡不渲染——报表基线要求维度/时间筛选，缺省须在台账登记豁免理由。
   * 筛选值由页面受控管理：onFilterChange 更新草稿值，onFilterApply（查询按钮）
   * 时页面才把草稿值并入 queryKey 触发请求，避免逐键发请求。
   */
  filters?: SearchFormField[];
  filterValues?: SearchFormValues;
  onFilterChange?: (values: SearchFormValues) => void;
  onFilterApply?: () => void;
  onFilterReset?: () => void;
  filterLoading?: boolean;

  /** 快捷时间档按钮组（渲染在标题下方）；activePresetDays 控制高亮 */
  presets?: ReportDatePreset[];
  activePresetDays?: number;
  onPresetChange?: (preset: ReportDatePreset, range: { start: string; end: string }) => void;

  /** 数据三态：error 全量替换内容区；loading 骨架；isEmpty 空态替换 children */
  loading?: boolean;
  error?: unknown;
  /** 错误重试回调（通常接 useQueryData 的 refresh）；不传则整页 reload */
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;

  /**
   * 手动查询模式（查询工具页子形态：输入条件→点查询→一次性结果）。
   * true 时页面数据由「查询」按钮触发（useMutateData 或 enabled 受控的 useQueryData），
   * 模板在 queried=false 时以"请设置查询条件"提示态代替 children，
   * 不渲染首载骨架屏。配套传 `queried` 告知模板是否已发起过查询。
   */
  manual?: boolean;
  /** manual 模式下：页面是否已发起过查询（false 时渲染查询提示态） */
  queried?: boolean;

  /** 刷新机制：传入后在标题行右侧渲染常驻刷新按钮 */
  onRefresh?: () => void;

  /** 标题行附加内容（如口径说明） */
  headerExtra?: React.ReactNode;
  /** 指标卡网格槽位（位于筛选区之下、内容区之上） */
  summary?: React.ReactNode;
  /** 报表主体：图表卡 / 分析表格卡，由页面自组 */
  children: React.ReactNode;
  className?: string;
}

/** 报表页骨架屏：指标卡网格 + 两块图表区占位 */
function ReportSkeleton() {
  return (
    <div data-testid="report-skeleton" className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-md" />
      <Skeleton className="h-64 rounded-md" />
    </div>
  );
}

/**
 * 报表/分析页统一模板（taxonomy §2.5 标准组件集的壳承载）。
 * 内建：面包屑/标题、筛选卡（SearchForm 协议）、快捷时间档、刷新按钮、
 * 加载骨架/ErrorState/EmptyState 三态。图表与表格由页面经 children/summary 槽位自组。
 */
export function ReportPage({
  title,
  description,
  breadcrumb,
  filters,
  filterValues,
  onFilterChange,
  onFilterApply,
  onFilterReset,
  filterLoading = false,
  presets,
  activePresetDays,
  onPresetChange,
  loading = false,
  error = null,
  onRetry,
  isEmpty = false,
  emptyTitle = `暂无${title}`,
  emptyDescription = '请尝试调整筛选条件后重新查询',
  manual = false,
  queried = false,
  onRefresh,
  headerExtra,
  summary,
  children,
  className,
}: ReportPageProps) {
  const hasFilters = filters && filters.length > 0;

  const renderContent = () => {
    if (error) {
      return (
        <ErrorState
          message={toErrorMessage(error)}
          onRetry={onRetry ?? (() => window.location.reload())}
        />
      );
    }
    if (manual && !queried) {
      return (
        <EmptyState
          variant="info"
          title="请设置查询条件"
          description="填写查询条件后点击「查询」获取结果"
        />
      );
    }
    if (loading && isEmpty) {
      return <ReportSkeleton />;
    }
    if (isEmpty) {
      return <EmptyState title={emptyTitle} description={emptyDescription} />;
    }
    return (
      <div className={cn('space-y-4', loading && 'opacity-50 pointer-events-none')}>
        {children}
      </div>
    );
  };

  return (
    <PageContainer className={className}>
      {breadcrumb && (
        <SimpleBreadcrumb
          items={breadcrumb.map((b: string) => ({ label: b }))}
          className="text-muted-foreground opacity-30 -mt-3"
        />
      )}
      <div className="flex items-start justify-between gap-4">
        {/* 标题与说明同行左右结构（底部对齐、间隔 32px），规范见 PAGE_HEADER_USAGE.md */}
        <div className="flex items-baseline gap-8 min-w-0">
          <h1 className="text-xl font-semibold shrink-0">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          {onRefresh && (
            <Button
              variant="outline"
              size="xs"
              onClick={onRefresh}
              disabled={loading}
              data-testid="report-refresh"
            >
              <ArrowClockwise className="h-4 w-4" />
              刷新
            </Button>
          )}
        </div>
      </div>

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

      {hasFilters && (
        <Card className="flex flex-col p-4 gap-3">
          <SearchForm
            fields={filters}
            values={filterValues ?? {}}
            onChange={onFilterChange ?? (() => {})}
            onSearch={onFilterApply ?? (() => {})}
            onReset={onFilterReset ?? (() => {})}
            layout="grid"
            loading={filterLoading}
          />
        </Card>
      )}

      {summary}

      {renderContent()}
    </PageContainer>
  );
}
