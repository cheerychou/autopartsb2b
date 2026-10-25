import * as React from 'react';
// 直接从兄弟组件源文件导入，不经过包出口 index.ts，避免 index ↔ standard-list-page 循环引用
// （循环在生产分包后导致 chunk 间循环依赖、ESM 初始化顺序损坏、React undefined 白屏）。
import { Card } from '../ui/card';
import { ErrorState } from '../ui/error-state';
import { EmptyState } from '../ui/empty-state';
import { SimpleBreadcrumb } from '../ui/breadcrumb';
import { PageContainer } from './page-container';
import { SearchForm, type SearchFormField } from './search-form';
import { SegmentTabsA } from './segment-tabs';
import { DataTable, type Column } from './data-table';
import { cn } from "cn";
import { Skeleton } from '../ui/skeleton';
import { toErrorMessage } from '../../lib/normalize-error';

export interface StandardListPageProps<T extends object> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;

  /**
   * 搜索字段配置。省略或传空数组时，整块搜索区（含查询/重置按钮）不渲染，
   * 用于无搜索需求的简单列表页（如收货地址、薪资结构模板等）。
   */
  searchFields?: SearchFormField[];
  searchValues?: Record<string, unknown>;
  onSearchChange?: (values: Record<string, unknown>) => void;
  onSearch?: () => void;
  onReset?: () => void;
  searchLoading?: boolean;

  statusFilter?: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
  };

  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: unknown;
  /** 错误重试回调（通常接 useQueryData 的 refresh）；不传则整页 reload */
  onRetry?: () => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;

  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;

  onRowClick?: (item: T) => void;
  getRowKey?: (item: T, index: number) => string;

  breadcrumb?: string[];
  headerContent?: React.ReactNode;
  className?: string;
}

/** 骨架屏行数量 */
const SKELETON_ROWS = 5;

/**
 * 列表页骨架屏占位
 */
function ListSkeleton() {
  return (
    <div data-testid="list-skeleton" className="rounded-md border p-6 space-y-4">
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StandardListPage<T extends object>({
  title,
  description,
  action,
  secondaryAction,
  searchFields,
  searchValues,
  onSearchChange,
  onSearch,
  onReset,
  searchLoading = false,
  statusFilter,
  data,
  columns,
  loading = false,
  error = null,
  onRetry,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  sortKey,
  sortOrder,
  onSort,
  onRowClick,
  getRowKey,
  breadcrumb,
  headerContent,
  className,
}: StandardListPageProps<T>) {
  // data 归一化:useQueryData 初始返回 null(非 undefined),默认参数接不住,这里统一转 []
  const list = data ?? [];
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={onRetry ?? (() => window.location.reload())} />;

  const renderView = () => {
    if (loading && list.length === 0) {
      return <ListSkeleton />;
    }

    if (list.length === 0) {
      return (
        <EmptyState
          title={`暂无${title}`}
          description="请尝试调整搜索条件或添加新数据"
        />
      );
    }

    return (
      <div className={cn(
        "transition-opacity duration-normal",
        loading && "opacity-50 pointer-events-none"
      )}>
        <DataTable
          data={list}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={onSort}
          getRowProps={onRowClick ? (item) => ({ onClick: () => onRowClick(item), className: 'cursor-pointer' }) : undefined}
          getRowKey={getRowKey}
        />
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
      {/* 标题与说明同行左右结构（底部对齐、间隔 32px），规范见 PAGE_HEADER_USAGE.md */}
      <div className="flex items-baseline gap-8 min-w-0">
        <h1 className="text-xl font-semibold shrink-0">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>

      {searchFields && searchFields.length > 0 && (
        <Card className="flex flex-col p-4 gap-3">
          <SearchForm
            fields={searchFields}
            values={searchValues ?? {}}
            onChange={onSearchChange ?? (() => {})}
            onSearch={onSearch ?? (() => {})}
            onReset={onReset ?? (() => {})}
            layout="grid"
            loading={searchLoading}
          />
        </Card>
      )}

      {headerContent}

      {(action || statusFilter || secondaryAction) && (
        <div className="flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            {action && action}
            {statusFilter && (
              <SegmentTabsA
                items={statusFilter.options}
                value={statusFilter.value}
                onChange={statusFilter.onChange}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {secondaryAction && secondaryAction}
          </div>
        </div>
      )}

      {renderView()}
    </PageContainer>
  );
}
