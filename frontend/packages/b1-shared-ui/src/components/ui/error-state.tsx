import { Button } from "./button"

/**
 * ErrorState 组件：统一的错误态展示与重试入口
 */
export interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = "加载失败", onRetry }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <p className="text-base font-medium text-destructive">{message}</p>
        {onRetry && (
          <div className="mt-3">
            <Button variant="outline" onClick={onRetry}>重试</Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorState