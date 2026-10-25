import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from "cn";
import type { IconComponent } from '../../types';
import { PageContainer } from './page-container';
import { PageBreadcrumb, type BreadcrumbItemData } from '../ui/breadcrumb';
import { Button, buttonVariants } from '../ui/button';
import { Badge } from '../ui/badge';
import { StatusBadge } from '../ui/status-badge';
import type { StatusTone } from '../ui/status-badge';
import { Spinner } from '../ui/spinner';
import { ErrorState } from '../ui/error-state';
import { EmptyState } from '../ui/empty-state';
import { toErrorMessage } from '../../lib/normalize-error';
import { Printer, ArrowLeft } from "@phosphor-icons/react";

export interface DetailPageAction {
  key: string;
  label: string;
  icon?: IconComponent;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  visible?: boolean;
  asLink?: boolean;
  to?: string;
}

export interface DetailPageLayoutProps {
  breadcrumbItems: string[];
  title: string;
  subtitle?: string;
  statusBadge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    tone?: StatusTone;
  };
  actions?: DetailPageAction[];
  onPrint?: () => void;
  printLoading?: boolean;
  onBack?: () => void;
  /** 声明式返回路径（onBack 未传时生效，标题左侧渲染返回按钮跳转该路径） */
  backPath?: string;
  loading?: boolean;
  loadingText?: string;
  /** 错误（truthy 时渲染 ErrorState；兼容 Error 对象 / string / null，内部 normalize） */
  error?: unknown;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
  className?: string;
  headerRightContent?: React.ReactNode;
}

/**
 * 将字符串数组转换为面包屑项数组
 */
function toBreadcrumbItems(items: string[]): BreadcrumbItemData[] {
  return items.map((label, index) => ({
    label,
    href: index === items.length - 1 ? undefined : '#',
  }));
}

/**
 * 详情页布局组件
 * 统一详情页的面包屑、标题、操作按钮、加载/错误/空状态处理
 */
export function DetailPageLayout({
  breadcrumbItems,
  title,
  subtitle,
  statusBadge,
  actions = [],
  onPrint,
  printLoading = false,
  onBack,
  backPath,
  loading = false,
  loadingText = '加载中...',
  error,
  onRetry,
  empty = false,
  emptyTitle = '未找到数据',
  emptyDescription = '该数据可能不存在或已被删除',
  children,
  className,
  headerRightContent,
}: DetailPageLayoutProps) {
  // backPath 兜底返回：批 C 起多页传 backPath，此前为死 prop（声明未消费），
  // F3 修复恢复语义——onBack 未传时按 backPath 渲染标题左侧返回按钮
  const navigate = useNavigate();
  const handleBack = onBack ?? (backPath ? () => navigate(backPath) : undefined);

  if (loading) {
    return (
      <PageContainer>
        <PageBreadcrumb
          items={toBreadcrumbItems(breadcrumbItems)}
          className="text-muted-foreground opacity-30 -mt-2"
        />
        <div className="flex flex-col items-center justify-center h-[400px]">
          <Spinner label={loadingText} />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageBreadcrumb
          items={toBreadcrumbItems(breadcrumbItems)}
          className="text-muted-foreground opacity-30 -mt-2"
        />
        <div className="flex flex-col items-center justify-center h-[400px]">
          <ErrorState message={toErrorMessage(error)} onRetry={onRetry} />
        </div>
      </PageContainer>
    );
  }

  if (empty) {
    return (
      <PageContainer>
        <PageBreadcrumb
          items={toBreadcrumbItems(breadcrumbItems)}
          className="text-muted-foreground opacity-30 -mt-2"
        />
        <div className="flex flex-col items-center justify-center h-[400px]">
          <EmptyState title={emptyTitle} description={emptyDescription} />
          {handleBack && (
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>
          )}
        </div>
      </PageContainer>
    );
  }

  const visibleActions = actions.filter((action) => action.visible !== false);

  return (
    <PageContainer className={className}>
      <PageBreadcrumb
        items={toBreadcrumbItems(breadcrumbItems)}
        className="text-muted-foreground opacity-30 -mt-2"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {handleBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="返回"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && (
            <span className="text-sm text-muted-foreground">{subtitle}</span>
          )}
          {statusBadge && (
            statusBadge.tone ? (
              <StatusBadge tone={statusBadge.tone}>{statusBadge.text}</StatusBadge>
            ) : (
              <Badge variant={statusBadge.variant || 'default'}>{statusBadge.text}</Badge>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          {headerRightContent}
          {onPrint && (
            <Button variant="outline" onClick={onPrint} disabled={printLoading}>
              <Printer className="w-4 h-4 mr-2" />
              {printLoading ? '打印中...' : '打印'}
            </Button>
          )}
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const buttonContent = (
              <>
                {Icon && <Icon className="w-4 h-4 mr-2" />}
                {action.loading ? '处理中...' : action.label}
              </>
            );
            
            if (action.asLink && action.to) {
              return (
                <Link
                  key={action.key}
                  to={action.to}
                  data-slot="button"
                  className={buttonVariants({ variant: action.variant || 'outline' })}
                  aria-disabled={action.disabled || action.loading || undefined}
                >
                  {buttonContent}
                </Link>
              );
            }
            
            return (
              <Button
                key={action.key}
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
              >
                {buttonContent}
              </Button>
            );
          })}
        </div>
      </div>

      {children}
    </PageContainer>
  );
}

export interface DetailSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: IconComponent;
  action?: React.ReactNode;
  columns?: 2 | 3 | 4;
}

/**
 * 详情页区块组件
 * 用于组织详情页中的各个信息区块
 */
export function DetailSection({
  title,
  icon: Icon,
  action,
  columns = 4,
  children,
  className,
  ...props
}: DetailSectionProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <div className={cn('flex flex-col p-4 gap-3 border rounded-lg', className)} {...props}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </h2>
        {action}
      </div>
      <div className={cn('grid grid-cols-1 gap-4 text-sm', gridCols[columns])}>
        {children}
      </div>
    </div>
  );
}
