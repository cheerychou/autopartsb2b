/**
 * 版本标识组件
 *
 * 侧边栏最底部展示当前产品版本信息（展开态显示版本 + git sha，折叠态竖排应用名）。
 * 版本号唯一事实源 = frontend/package.json（vite 构建时经 __BUILD_INFO__ 注入，
 * 机制见 vite.config.shared.ts）；git sha 由部署链路传入（Docker 构建）或本地
 * git 命令采集，代码中零硬编码。
 */

import { useSidebar } from './sidebar';

/** 构建信息（由 vite define 注入，见 vite.config.shared.ts） */
interface BuildInfo {
  /** SemVer 版本号（frontend/package.json 的 version 字段） */
  version: string;
  /** git 短 hash（Docker 构建经 GIT_SHA 环境变量传入；本地为 git 命令采集） */
  sha: string;
}

// 模块内 ambient 声明：__BUILD_INFO__ 标识符由应用构建时 vite define 替换为字面量，
// 运行时不存在该全局变量（所以下方必须 try/catch 兜底，不能直接访问）。
// 注意不能写成 globalThis.__BUILD_INFO__——define 只替换独立标识符，属性访问不替换。
declare const __BUILD_INFO__: BuildInfo | undefined;

/** 未注入环境（vitest / RN 侧）的兜底值 */
const FALLBACK_BUILD_INFO: BuildInfo = { version: '0.0.0', sha: 'dev' };

/**
 * 获取构建信息
 *
 * __BUILD_INFO__ 标识符由 vite define 在应用构建时替换为字面量；
 * 未注入环境（vitest / RN）中标识符不存在，ReferenceError 走兜底。
 */
export function getBuildInfo(): BuildInfo {
  try {
    return __BUILD_INFO__ ?? FALLBACK_BUILD_INFO;
  } catch {
    return FALLBACK_BUILD_INFO;
  }
}

export interface VersionBadgeProps {
  /** 应用名称（各应用 appConfig.appName） */
  appName: string;
}

/**
 * 版本标识组件
 */
export function VersionBadge({ appName }: VersionBadgeProps) {
  const { state } = useSidebar();
  const { version, sha } = getBuildInfo();

  if (state === 'collapsed') {
    return (
      <div className="flex flex-col items-center py-1">
        <span
          className="text-xs leading-tight text-muted-foreground/50"
          style={{ writingMode: 'vertical-rl' }}
        >
          {appName}
        </span>
      </div>
    )
  }

  return (
    <div className="px-2 py-1.5 text-center text-xs text-muted-foreground/50">
      {appName} v{version} · g{sha}
    </div>
  )
}
