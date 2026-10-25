import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** 订阅视口尺寸变化，变化时触发回调 */
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

/** 读取当前是否为移动端视口（客户端快照） */
function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

/** 服务端渲染快照（默认非移动端） */
function getServerSnapshot() {
  return false
}

/** 检测当前视口是否为移动端宽度 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
