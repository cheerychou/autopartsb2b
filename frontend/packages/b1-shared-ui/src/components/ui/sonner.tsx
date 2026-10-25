import { Toaster } from "sonner";

/**
 * Toast通知提供者组件
 * 包装sonner的Toaster组件，提供统一的配置
 */
export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      className="dark"
    />
  );
}
