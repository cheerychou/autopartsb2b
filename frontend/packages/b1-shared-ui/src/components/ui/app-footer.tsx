interface AppFooterProps {
  className?: string;
}

/**
 * 应用底栏组件
 * @param className - 自定义类名
 */
export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer className={className ?? "shrink-0 border-t px-6 py-3 text-center text-xs text-muted-foreground/60"}>
      杭州神兵科技有限公司&emsp;&emsp;&emsp;© 2024-2026 Hangzhou Shenbing Technology Co., Ltd.&emsp;&emsp;&emsp;All Rights Reserved.
    </footer>
  );
}
