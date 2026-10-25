/**
 * Sentry 浏览器配置工厂。
 *
 * 把"脱敏逻辑"与 `@sentry/react` 的 `init()` 解耦：
 * 本函数接收业务参数，返回一个已内嵌 PII 脱敏 `beforeSend` 钩子的
 * `Sentry.BrowserOptions` 对象，供各 Web app 直接 `Sentry.init(...)` 使用。
 *
 * 这样设计的好处：
 * 1. 各 app 不必各自实现脱敏逻辑，统一走 shared-http 的 scrubValue。
 * 2. 脱敏规则变更只改一处（scrub.ts），所有端同步生效。
 * 3. 工厂本身是纯函数（除构造 options 外无副作用），便于理解与测试。
 */
import type { BrowserOptions, ErrorEvent } from '@sentry/react';

import { scrubValue } from './scrub';

/**
 * 创建 Sentry 客户端所需的初始化参数。
 */
export interface SentryInitOptions {
  /** Sentry 项目 DSN（不配置则由调用方决定是否跳过初始化） */
  dsn: string;
  /** 环境标识，如 production / staging / development */
  environment: string;
  /** 发版号，用于在 Sentry 里按版本过滤/定位（可选） */
  release?: string;
  /** 性能采样率 0-1（可选，默认 0.2） */
  tracesSampleRate?: number;
  /** 来源 app 名称，写入 tag 便于在 Sentry 面板区分 store-web / platform-web 等 */
  appname: string;
}

/**
 * 生成带 PII 脱敏钩子的 Sentry 浏览器配置。
 *
 * 脱敏覆盖最常含 PII 的载体（与移动端 sentry-service.ts 保持一致）：
 * - request：请求头/体
 * - extra：额外上下文
 * - contexts：上下文对象
 * - exception.values[]：错误消息文本（常拼接手机号/姓名）
 * - breadcrumbs[]：用户操作轨迹（常含车牌/订单信息）
 *
 * 脱敏自身出错时不阻断上报（catch 静默返回原 event）。
 */
export function createSentryBrowserOptions(
  opts: SentryInitOptions,
): BrowserOptions {
  const {
    dsn,
    environment,
    release,
    tracesSampleRate = 0.2,
    appname,
  } = opts;

  return {
    dsn,
    environment,
    release,
    tracesSampleRate,
    attachStacktrace: true,
    sendDefaultPii: false, // 不发送默认 PII（合规底线，与后端 sentry_config.py 一致）
    initialScope: {
      // 用 tag 而非 user 字段标记来源 app，避免与登录用户信息混淆
      tags: { app: appname },
    },
    beforeSend(event: ErrorEvent): ErrorEvent | null {
      try {
        if (event.request) {
          event.request = scrubValue(event.request);
        }
        if (event.extra) {
          event.extra = scrubValue(event.extra);
        }
        if (event.contexts) {
          event.contexts = scrubValue(event.contexts);
        }
        // 异常消息文本（如 throw new Error("客户 13800138000 不存在")）
        if (event.exception?.values) {
          event.exception.values = scrubValue(event.exception.values);
        }
        // 面包屑消息与 data（用户操作轨迹，常含车牌/订单号/手机号）
        if (event.breadcrumbs) {
          event.breadcrumbs = scrubValue(event.breadcrumbs);
        }
      } catch {
        // 脱敏自身出错时不阻断上报
      }
      return event;
    },
  };
}
