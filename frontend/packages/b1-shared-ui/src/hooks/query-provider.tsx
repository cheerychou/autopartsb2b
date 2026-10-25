import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * 创建 QueryClient 实例，配置全局默认值
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // retry: false（ADT-OP-003 N8）：POST/DELETE 等非幂等写操作在「请求超时
        // 但服务端已成功」场景下自动重试会产生重复创建/重复删除。写操作失败
        // 一律交由调用方就地反馈（toast/错误态），不做静默重试。
        // queries 的 retry: 2 保持不变——GET 幂等，重试安全。
        retry: false,
      },
    },
  });
}

/**
 * React Query Provider 组件
 * 包裹在应用根组件外层，提供 QueryClient 上下文
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
