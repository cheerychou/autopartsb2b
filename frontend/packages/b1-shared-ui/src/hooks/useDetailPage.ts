import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseDetailPageOptions<T> {
  fetchFn: (id: string) => Promise<T>;
  id: string | undefined;
  autoFetch?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseDetailPageReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * 详情页数据获取 Hook
 * 标准化详情页的状态处理逻辑
 */
export function useDetailPage<T>({
  fetchFn,
  id,
  autoFetch = true,
  onSuccess,
  onError,
}: UseDetailPageOptions<T>): UseDetailPageReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!id) {
      setData(null);
      setError('缺少必要参数');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(id);
      if (isMounted.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMounted.current) {
        const errorMessage = err instanceof Error ? err.message : '加载失败';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMounted.current = true;
    let cancelled = false;
    if (autoFetch) {
      // 使用 async IIFE 避免在 effect 体内同步调用 setState
      (async () => {
        if (!id) {
          setData(null);
          setError('缺少必要参数');
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const result = await fetchFn(id);
          if (!cancelled && isMounted.current) {
            setData(result);
            onSuccess?.(result);
          }
        } catch (err) {
          if (!cancelled && isMounted.current) {
            const errorMessage = err instanceof Error ? err.message : '加载失败';
            setError(errorMessage);
            onError?.(err instanceof Error ? err : new Error(errorMessage));
          }
        } finally {
          if (!cancelled && isMounted.current) {
            setLoading(false);
          }
        }
      })();
    }
    return () => {
      cancelled = true;
      isMounted.current = false;
    };
  }, [autoFetch, id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData,
  };
}

export interface UseDetailPageActionsOptions<T> {
  onUpdate?: (data: T) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onStatusChange?: (id: string, status: string) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseDetailPageActionsReturn {
  updating: boolean;
  deleting: boolean;
  statusChanging: boolean;
  handleUpdate: <T>(data: T, updateFn: (data: T) => Promise<void>) => Promise<void>;
  handleDelete: (id: string, deleteFn: (id: string) => Promise<void>) => Promise<void>;
  handleStatusChange: (id: string, status: string, statusFn: (id: string, status: string) => Promise<void>) => Promise<void>;
}

/**
 * 详情页操作 Hook
 * 标准化详情页的更新、删除、状态变更操作
 */
export function useDetailPageActions({
  onSuccess,
  onError,
}: UseDetailPageActionsOptions<any> = {}): UseDetailPageActionsReturn {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const handleUpdate = useCallback(async <T,>(data: T, updateFn: (data: T) => Promise<void>) => {
    setUpdating(true);
    try {
      await updateFn(data);
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('更新失败'));
    } finally {
      setUpdating(false);
    }
  }, [onSuccess, onError]);

  const handleDelete = useCallback(async (id: string, deleteFn: (id: string) => Promise<void>) => {
    setDeleting(true);
    try {
      await deleteFn(id);
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('删除失败'));
    } finally {
      setDeleting(false);
    }
  }, [onSuccess, onError]);

  const handleStatusChange = useCallback(async (id: string, status: string, statusFn: (id: string, status: string) => Promise<void>) => {
    setStatusChanging(true);
    try {
      await statusFn(id, status);
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('状态变更失败'));
    } finally {
      setStatusChanging(false);
    }
  }, [onSuccess, onError]);

  return {
    updating,
    deleting,
    statusChanging,
    handleUpdate,
    handleDelete,
    handleStatusChange,
  };
}
