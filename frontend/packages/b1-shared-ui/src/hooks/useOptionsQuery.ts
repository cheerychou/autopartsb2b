import { useCallback, useMemo } from 'react';
import { useQueryData } from './use-query-data';

/**
 * 下拉选项数据源 Hook（useOptionsQuery，ADT-ALL-004 §5.5）
 *
 * 收敛 dp 各页逐字重复的「下拉全量拉取」样板：useQueryData +
 * `page_size: 1000` 全量 + `page_size: 1000` 后手工映射 options
 * 的三段式（44 处 / 28 文件，✅ rg 实测口径）。value/label 取值函数
 * 可配；labelOf 提供 value → label 回显（编辑/详情场景）。
 *
 * 全量拉取本身是 dp 主数据量级下的既有拍板语义（§5.5 证据），本 hook
 * 不改变取数策略，只收敛样板与回显；分页化下拉（搜索远端）属后续迭代。
 *
 * @example
 * ```tsx
 * const terms = useOptionsQuery({
 *   queryKey: ['terms-dropdown'],
 *   fetcher: async () => dataPlatformService.terms.list({ page: 1, page_size: 1000 }).then((r) => r.results),
 *   value: (t) => t.termId,
 *   label: (t) => `${t.termCode} - ${t.standardNameZh}`,
 * });
 * // options 直连 Select/CRUD fields；labelOf(value) 用于详情回显；
 * // refresh() 透传 useQueryData（保存后刷新下拉场景）
 * ```
 */
export interface OptionItem {
  label: string;
  value: string;
}

export interface OptionsQueryOptions<T extends object> {
  queryKey: unknown[];
  fetcher: () => Promise<T[]>;
  /** 数据视为过时时间（毫秒），默认 5 分钟（下拉主数据惯例） */
  staleTime?: number;
  enabled?: boolean;
  /** 选项 value 取值 */
  value: (item: T) => string;
  /** 选项 label 取值 */
  label: (item: T) => string;
}

export function useOptionsQuery<T extends object>(opts: OptionsQueryOptions<T>) {
  const { data = [], loading, error, refresh } = useQueryData<T[]>({
    queryKey: opts.queryKey,
    staleTime: opts.staleTime ?? 5 * 60 * 1000,
    enabled: opts.enabled,
    fetcher: opts.fetcher,
  });

  const options = useMemo<OptionItem[]>(
    () => data.map((item) => ({ value: opts.value(item), label: opts.label(item) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const labelOf = useCallback(
    (value: string) => options.find((o) => o.value === value)?.label,
    [options],
  );

  return { options, data, loading, error, labelOf, refresh };
}
