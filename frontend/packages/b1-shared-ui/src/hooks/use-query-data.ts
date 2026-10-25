import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * useQueryData 配置选项
 */
export interface UseQueryDataOptions<T> {
  /** React Query 的缓存键，用于标识和共享请求 */
  queryKey: unknown[];
  /** 异步数据获取函数 */
  fetcher: () => Promise<T>;
  /** 是否启用查询（默认 true），设为 false 时暂停请求 */
  enabled?: boolean;
  /** 数据被视为过时的时间（毫秒），默认 30000（30 秒） */
  staleTime?: number;
  /** 缓存保留时间（毫秒），默认 300000（5 分钟） */
  gcTime?: number;
  /** 失败重试次数，默认 2 */
  retry?: number | boolean;
  /** 初始/占位数据，在首次加载或错误时使用 */
  initialData?: T;
  /** 占位数据函数（v5）：传 keepPreviousData 时 queryKey 变化期间保留上一份数据，
   *  配合「loading 且无数据才显示骨架」的容器可消除翻页/筛选时的闪烁（ADT-ALL-004 批11 专项）。
   *  注：react-query 对该函数签名的 Query 泛型要求严格（同 refetchInterval），
   *  此处用宽松类型以兼容所有调用方，由 react-query 运行时保证类型安全。 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeholderData?: any;
  /** 窗口聚焦时是否重新请求，默认 true */
  refetchOnWindowFocus?: boolean;
  /** 轮询间隔（毫秒），设为 false 停止轮询。
   * 支持函数形式 (query) => number | false，可根据返回数据动态决定是否继续轮询。
   * 典型场景：异步任务轮询，终态时返回 false 停止。
   * @example
   * // 每 2 秒轮询，任务完成/失败后停止
   * refetchInterval: (query) => {
   *   const status = query.state.data?.status;
   *   return status === 'completed' || status === 'failed' ? false : 2000;
   * }
   */
  // 注：react-query 的 refetchInterval 函数签名对 Query 泛型要求严格，
  // 此处用宽松类型（any）以兼容所有调用方，由 react-query 运行时保证类型安全。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refetchInterval?: number | false | ((query: any) => number | false | undefined);
}

/**
 * 兼容 useApiData 接口的 React Query hook
 *
 * 返回值与 useApiData 完全相同：{ data, loading, error, refresh, setData }
 * 内部使用 React Query 的 useQuery 实现，自动获得缓存、去重、重试等能力
 *
 * @example
 * // 基本用法 — 替代 useApiData
 * const { data: brands, loading, refresh } = useQueryData({
 *   queryKey: ['brands'],
 *   fetcher: () => brandService.getBrands(),
 * });
 *
 * @example
 * // 列表页用解构默认值兜底（首载时 data 为 undefined，默认值 [] 接管）
 * const { data: brands = [], loading } = useQueryData({
 *   queryKey: ['brands'],
 *   fetcher: () => brandService.getBrands(),
 * });
 *
 * @example
 * // 或显式传 initialData（首载/出错都回退到 initialData）
 * const { data: brands, loading } = useQueryData({
 *   queryKey: ['brands'],
 *   fetcher: () => brandService.getBrands(),
 *   initialData: [],
 * });
 *
 * @example
 * // 带搜索参数 — queryKey 变化时自动重新请求
 * const { data: results, loading } = useQueryData({
 *   queryKey: ['brands', { keyword, status }],
 *   fetcher: () => brandService.getBrands({ keyword, status }),
 *   initialData: [],
 * });
 */
export function useQueryData<T>({
  queryKey,
  fetcher,
  enabled = true,
  staleTime,
  gcTime,
  retry,
  initialData,
  placeholderData,
  refetchOnWindowFocus,
  refetchInterval,
}: UseQueryDataOptions<T>) {
  const queryClient = useQueryClient();

  const queryResult = useQuery<T>({
    queryKey,
    queryFn: fetcher,
    enabled,
    staleTime,
    gcTime,
    retry,
    initialData,
    placeholderData,
    refetchOnWindowFocus,
    refetchInterval,
  });

  /** 手动刷新数据（等价于 useApiData 的 refresh） */
  const refresh = useCallback(async () => {
    const result = await queryClient.refetchQueries({ queryKey });
    return result;
  }, [queryClient, queryKey]);

  /** 直接设置数据（等价于 useApiData 的 setData） */
  const setData = useCallback(
    (updater: T | ((old: T | undefined) => T | undefined)) => {
      queryClient.setQueryData<T>(queryKey, updater);
    },
    [queryClient, queryKey],
  );

  return {
    /**
     * 响应数据。
     * - 提供 initialData 时：首载/出错回退到 initialData，永不为 undefined/null。
     * - 未提供 initialData 时：首载/出错返回 undefined（与 react-query 原生语义一致），
     *   调用方可用解构默认值 `const { data = [] } = useQueryData(...)` 兜底。
     *
     * ⚠️ 历史教训（KNW-EXP-007 续）：此处曾用 `?? null` 把 undefined 转成 null，
     *   但 ES 解构默认值 `= []` 只对 undefined 生效、对 null 无效，导致 200+ 处
     *   列表页 `const { data = [] }` 在首载时实际拿到 null，传给 DataTable 触发
     *   `null.length` 崩溃（如 data.chedidai.com /geographic 页）。改为返回
     *   undefined 让解构默认值正确接管。
     */
    data: (initialData !== undefined ? (queryResult.data ?? initialData) : queryResult.data) as typeof initialData extends undefined ? T | undefined : T,
    /** 是否正在加载（首次加载或正在重新请求） */
    loading: queryResult.isLoading || queryResult.isFetching,
    /** 错误信息 */
    error: queryResult.error,
    /** 是否发生错误（便利字段，等价 !!error） */
    isError: !!queryResult.error,
    /** 手动刷新数据 */
    refresh,
    /** 直接设置缓存数据 */
    setData,
    /** React Query 原始结果，供高级场景使用 */
    queryResult,
  } as const;
}
