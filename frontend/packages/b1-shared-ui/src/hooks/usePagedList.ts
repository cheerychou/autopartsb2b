/**
 * 分页列表状态 Hook（usePagedList）
 *
 * 三应用列表页的内联分页三件套（`useState(1)` + `setTotal` 写外部 state + fetcher 反模式）
 * 收敛为单一状态层。设计：ADT-ALL-004 §4-1（V1.1 信封适配设计）。
 *
 * 分层约定：
 * - **状态层**（本 hook）：page / pageSize / total / 翻页 / 搜索 / 重置；
 * - **信封适配层**（应用 fetcher）：wire 格式（DRF `count/results`、`{data,total}` 双层信封等）
 *   在应用 fetcher 内归一为 `{ items, total }`，本 hook 不感知传输格式。
 *
 * @example
 * ```tsx
 * const list = usePagedList({
 *   // DRF 形态在 fetcher 内归一（应用侧职责）：
 *   fetcher: ({ page, pageSize }) =>
 *     fetchXxx({ page, size: pageSize }).then((r) => ({ items: r.results, total: r.count })),
 *   filters: { keyword }, // 受控筛选，变更即自动重取
 * });
 *
 * // StandardListPage 直连：
 * <StandardListPage
 *   data={list.items} total={list.total} page={list.page} pageSize={list.pageSize}
 *   onPageChange={list.onPageChange}
 *   loading={list.loading} error={list.error} onRetry={list.refresh}
 * />
 * ```
 *
 * 变更后刷新：页面 useMutateData 的 invalidateKeys 改用 `[['paged-list']]`
 * （本 hook 的 queryKey 均以 'paged-list' 开头，前缀匹配即失效重取）。
 */

import { useCallback, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useQueryData } from './use-query-data';

/** 归一化分页信封——应用 fetcher 的返回契约（wire 格式在应用侧归一为本形态） */
export interface PagedListEnvelope<T> {
  items: T[];
  total: number;
}

export type PagedListFetcher<T> = (params: { page: number; pageSize: number }) => Promise<PagedListEnvelope<T>>;

export interface UsePagedListOptions<T> {
  /** 取数函数：返回归一化信封（wire 格式在应用侧归一） */
  fetcher: PagedListFetcher<T>;
  /** 初始页码（1 起），默认 1 */
  initialPage?: number;
  /** 页大小，默认 20 */
  pageSize?: number;
  /** 筛选/搜索参数：进入 queryKey，变更即自动重取；重置时由页面清空此对象 */
  filters?: Record<string, unknown>;
  /** 数据视为过时时间（毫秒），透传 useQueryData；默认 30 秒 */
  staleTime?: number;
  /** 失败重试次数；默认 false——列表失败即时透出 ErrorState 由用户手动重试
   *  （与 SLP 三态契约匹配；useQueryData 自身默认 retry:2 的退避会让 loading 长时间闪烁） */
  retry?: number | boolean;
  /** 是否启用查询（透传 useQueryData）。条件取数场景（如 tree/list 双模式页只在列表模式拉分页）
   *  置 false——不请求，items/total 空兜底、loading=false；默认 true */
  enabled?: boolean;
}

/**
 * 分页列表状态层。取数走既有 useQueryData（React Query v5），不另起炉灶。
 */
export function usePagedList<T>({
  fetcher,
  initialPage = 1,
  pageSize = 20,
  filters,
  staleTime,
  retry = false,
  enabled = true,
}: UsePagedListOptions<T>) {
  const [page, setPage] = useState(initialPage);
  // 同参强制重取触发器：onSearch/onReset 在 page 已是 1 或 filters 未变时仍能触发重取
  const [trigger, setTrigger] = useState(0);

  const query = useQueryData({
    queryKey: ['paged-list', page, pageSize, JSON.stringify(filters ?? {}), trigger],
    fetcher: () => fetcher({ page, pageSize }),
    staleTime,
    retry,
    enabled,
    // 翻页/筛选重取期间保留上一份数据：SLP「loading 且无数据才骨架」+ 有数据半透明，
    // 消除换参时的整表闪烁（ADT-ALL-004 批11 后专项）
    placeholderData: keepPreviousData,
  });

  // 搜索/重置共享同一行为：回第一页 + 强制重取。
  // filters 清空由页面自持（受控 state），filters 变化经 queryKey 自动触发；
  // 此处 trigger 兜底覆盖「filters 本已为空」的场景。
  const onSearch = useCallback(() => {
    setPage(1);
    setTrigger((t) => t + 1);
  }, []);
  const onReset = onSearch;

  return {
    /** 当前页码（1 起） */
    page,
    /** 页大小 */
    pageSize,
    /** 总条数（fetcher 信封透出；未加载/出错为 0） */
    total: query.data?.total ?? 0,
    /** 当前页数据（未加载/出错为空数组——解构安全，见 useQueryData KNW-EXP-007 教训） */
    items: query.data?.items ?? ([] as T[]),
    /** 是否正在加载（首次或重新请求） */
    loading: query.loading,
    /** 错误信息 */
    error: query.error,
    /** 手动刷新 */
    refresh: query.refresh,
    /** 翻页（StandardListPage `onPageChange` 直连） */
    onPageChange: setPage,
    setPage,
    /** 搜索：回第一页并强制重取 */
    onSearch,
    /** 重置：回第一页并强制重取（filters 清空由页面自持） */
    onReset,
  } as const;
}

export type UsePagedListReturn<T> = ReturnType<typeof usePagedList<T>>;
