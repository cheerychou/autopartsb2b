import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * useMutateData 配置选项
 */
export interface UseMutateDataOptions<TData, TVariables> {
  /** 执行变更的异步函数 */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** 变更成功后需要失效的 queryKey 列表，触发相关查询自动刷新 */
  invalidateKeys?: unknown[][];
  /** 变更成功回调 */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** 变更失败回调 */
  onError?: (error: Error, variables: TVariables) => void;
}

/**
 * 数据变更 hook（POST / PUT / DELETE 操作）
 *
 * 用于创建、更新、删除等写操作，自动触发相关查询缓存失效
 *
 * @example
 * // 基本用法 — 创建品牌
 * const createBrand = useMutateData({
 *   mutationFn: (data: CreateBrandDTO) => brandService.createBrand(data),
 *   invalidateKeys: [['brands']],
 *   onSuccess: () => toast.success('创建成功'),
 * });
 *
 * // 调用
 * createBrand.mutate({ name: '新品牌' });
 */
export function useMutateData<TData = unknown, TVariables = unknown>({
  mutationFn,
  invalidateKeys = [],
  onSuccess,
  onError,
}: UseMutateDataOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  const mutationResult = useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      for (const key of invalidateKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      onError?.(error, variables);
    },
  });

  /** 手动触发缓存失效 */
  const invalidate = useCallback(
    async (keys?: unknown[][]) => {
      const targetKeys = keys ?? invalidateKeys;
      for (const key of targetKeys) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient, invalidateKeys],
  );

  return {
    /** 执行变更 */
    mutate: mutationResult.mutate,
    /** 异步执行变更（返回 Promise） */
    mutateAsync: mutationResult.mutateAsync,
    /** 是否正在执行 */
    loading: mutationResult.isPending,
    /** 错误信息 */
    error: mutationResult.error,
    /** 是否执行成功 */
    isSuccess: mutationResult.isSuccess,
    /** 手动触发缓存失效 */
    invalidate,
    /** React Query 原始 mutation 结果 */
    mutationResult,
  } as const;
}
