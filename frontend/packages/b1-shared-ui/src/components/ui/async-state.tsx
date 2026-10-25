import * as React from "react"
import { cn } from "cn"
import { toErrorMessage } from "../../lib/normalize-error"
import { ErrorState } from "./error-state"
import { EmptyState, type EmptyStateProps } from "./empty-state"
import { Spinner } from "./spinner"

export interface AsyncStateProps {
  /** 加载中（优先级最高，true 时渲染 skeleton） */
  loading?: boolean
  /** 错误（truthy 时渲染 ErrorState；兼容 Error 对象 / string / null） */
  error?: unknown
  /** 数据是否为空（loading 与 error 均无时，true 渲染 EmptyState） */
  isEmpty?: boolean
  /** 自定义加载占位，默认居中 Spinner */
  skeleton?: React.ReactNode
  /** 空态标题 */
  emptyTitle?: string
  /** 空态描述 */
  emptyDescription?: string
  /** 空态操作按钮（透传 EmptyState action） */
  emptyAction?: EmptyStateProps["action"]
  /** 空态 variant，默认 "default" */
  emptyVariant?: EmptyStateProps["variant"]
  /** 错误重试回调，透传 ErrorState onRetry（通常接 useQueryData 的 refresh） */
  onRetry?: () => void
  /** 自定义错误消息，默认用 toErrorMessage(error) */
  errorMessage?: string
  className?: string
  children?: React.ReactNode
}

/**
 * AsyncState：数据加载三态容器。
 *
 * 给非列表数据页（详情 / 工作台 / 仪表盘 / 卡片——StandardListPage 不适用的场景）
 * 一行包办 loading / error / empty / children，让「默认有三态」成为封装层保证。
 *
 * 渲染优先级：loading > error > isEmpty > children
 *
 * @example
 * const { data, loading, error, refresh } = useQueryData({...})
 * <AsyncState loading={loading} error={error} onRetry={refresh} isEmpty={!data}>
 *   <DetailContent data={data} />
 * </AsyncState>
 */
export function AsyncState({
  loading = false,
  error,
  isEmpty = false,
  skeleton,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyVariant = "default",
  onRetry,
  errorMessage,
  className,
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <>{skeleton ?? (
        <div className={cn("flex items-center justify-center py-12", className)}>
          <Spinner size={32} />
        </div>
      )}</>
    )
  }

  if (error) {
    return (
      <ErrorState
        message={errorMessage ?? toErrorMessage(error)}
        onRetry={onRetry}
      />
    )
  }

  if (isEmpty) {
    return (
      <EmptyState
        variant={emptyVariant}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    )
  }

  return <>{children}</>
}

export default AsyncState
