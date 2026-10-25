/**
 * 通用 API 类型定义
 * Shared API type definitions
 */

// ── API 响应 ──

/** 标准 API 响应信封 */
export interface ApiResponse<T = unknown> {
  success: boolean
  code: number | string
  message: string
  data: T
  meta?: {
    timestamp?: string
    requestId?: string
    version?: string
    pagination?: {
      page: number
      perPage: number
      total: number
      totalPages: number
    }
  }
}

// ── 分页 ──

/** 分页查询参数 */
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** DRF 风格分页响应（count/results/next/previous）——DRF 分页端点统一契约（ADT-ALL-004 §5.1） */
export interface DRFPaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** 页码型分页响应（items/total）——应用自有信封统一契约（ADT-ALL-004 §5.1） */
export interface PagedResponse<T> {
  items: T[]
  total: number
  page?: number
  pageSize?: number
  totalPages?: number
}

// ── 通用数据结构 ──

/** 日期范围 */
export interface DateRange {
  start: string
  end: string
}

/** 选项类型（下拉框 / 选择器） */
export interface Option {
  label: string
  value: string | number
  disabled?: boolean
}
