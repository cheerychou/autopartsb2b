import * as React from 'react';
import { cn } from "cn";
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { useDroppable } from '@dnd-kit/core';

export interface KanbanColumnProps {
  /** dnd-kit 落点 id；droppable=true 时必填 */
  id?: string;
  /** 是否为拖拽落点，默认 false。dnd-kit 唯一拖拽引擎（ENG-FE-DESIGN-004 §3.4），
   *  落点须处于页面级 DndContext 内；无 DndContext 时 hook 返回 inert 值，纯展示安全 */
  droppable?: boolean;
  /** 透传 useDroppable data；onDragEnd 时经 over.data.current 读取列信息 */
  data?: Record<string, unknown>;
  title: string;
  count?: number;
  statusColor?: string;
  children: React.ReactNode;
  /** 列宽度，默认为 18rem (288px) */
  width?: string | number;
  /** 是否显示空状态 */
  showEmpty?: boolean;
  /** 自定义空状态内容 */
  emptyContent?: React.ReactNode;
  /** 是否加载中 */
  loading?: boolean;
  /** 加载中的卡片数量 */
  loadingCount?: number;
  /** 自定义类名 */
  className?: string;
  /** 头部自定义类名 */
  headerClassName?: string;
  /** 内容区域自定义类名 */
  contentClassName?: string;
}

function ColumnBody({
  isOver,
  setNodeRef,
  children,
  className,
  headerClassName,
  contentClassName,
  widthStyle,
  title,
  count,
  statusColor,
  loading,
  loadingCount,
  showEmpty,
  emptyContent,
}: {
  isOver: boolean;
  setNodeRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  widthStyle: string;
  title: string;
  count: number;
  statusColor?: string;
  loading: boolean;
  loadingCount: number;
  showEmpty: boolean;
  emptyContent?: React.ReactNode;
}) {
  // 渲染加载骨架屏
  const renderSkeletons = () => {
    return Array.from({ length: loadingCount }).map((_, index) => (
      <div key={index} className="p-3 rounded-lg border bg-card">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ));
  };

  // 渲染空状态
  const renderEmpty = () => {
    if (emptyContent) {
      return emptyContent;
    }
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <svg
          className="w-12 h-12 mb-2 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className="text-sm">暂无数据</span>
      </div>
    );
  };

  // 判断是否有子元素
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border bg-muted/30 h-full transition-colors',
        isOver && 'bg-primary/5 border-primary/30 ring-2 ring-primary/20',
        className
      )}
      style={{ width: widthStyle, minWidth: widthStyle }}
    >
      {/* 头部 */}
      <div
        className={cn(
          'p-3 font-medium text-sm flex items-center justify-between border-b bg-muted/50 rounded-t-lg',
          headerClassName
        )}
      >
        <div className="flex items-center gap-2">
          {statusColor && (
            <span className={cn('w-2 h-2 rounded-full', statusColor)} />
          )}
          <span className="truncate">{title}</span>
        </div>
        <Badge
          variant="secondary"
          className="text-xs h-5 px-1.5 min-w-[1.25rem] justify-center shrink-0"
        >
          {count}
        </Badge>
      </div>

      {/* 内容区域 */}
      <div
        className={cn(
          'flex flex-col flex-1 overflow-y-auto p-2 gap-2 min-h-0',
          contentClassName
        )}
      >
        {loading ? (
          renderSkeletons()
        ) : hasChildren ? (
          children
        ) : showEmpty ? (
          renderEmpty()
        ) : null}
      </div>
    </div>
  );
}

export function KanbanColumn(props: KanbanColumnProps) {
  // 组件分支（而非 hook 条件调用）：hook 各自在子组件内无条件调用，满足 rules-of-hooks
  return props.droppable ? <DroppableColumn {...props} /> : <StaticColumn {...props} />;
}

function DroppableColumn({
  id,
  data,
  title,
  count = 0,
  statusColor,
  children,
  width = '18rem',
  showEmpty = true,
  emptyContent,
  loading = false,
  loadingCount = 3,
  className,
  headerClassName,
  contentClassName,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: id!, data });
  return (
    <ColumnBody
      isOver={isOver}
      setNodeRef={setNodeRef}
      className={className}
      headerClassName={headerClassName}
      contentClassName={contentClassName}
      widthStyle={typeof width === 'number' ? `${width}px` : width}
      title={title}
      count={count}
      statusColor={statusColor}
      loading={loading}
      loadingCount={loadingCount}
      showEmpty={showEmpty}
      emptyContent={emptyContent}
    >
      {children}
    </ColumnBody>
  );
}

function StaticColumn({
  title,
  count = 0,
  statusColor,
  children,
  width = '18rem',
  showEmpty = true,
  emptyContent,
  loading = false,
  loadingCount = 3,
  className,
  headerClassName,
  contentClassName,
}: KanbanColumnProps) {
  return (
    <ColumnBody
      isOver={false}
      className={className}
      headerClassName={headerClassName}
      contentClassName={contentClassName}
      widthStyle={typeof width === 'number' ? `${width}px` : width}
      title={title}
      count={count}
      statusColor={statusColor}
      loading={loading}
      loadingCount={loadingCount}
      showEmpty={showEmpty}
      emptyContent={emptyContent}
    >
      {children}
    </ColumnBody>
  );
}
