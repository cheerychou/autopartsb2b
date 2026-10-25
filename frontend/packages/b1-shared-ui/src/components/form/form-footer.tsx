import * as React from "react"
import { cn } from "cn"
import { Button } from "../ui/button"

/**
 * 动作种类（ENG-FE-DESIGN-005 §3.2 动作位置法则表的语义化）。
 * 位置由组件内建法则决定，页面无自由度：
 * - cancel / save-draft / previous → 左侧 outline（回退/放弃/暂存）
 * - next / submit → 右侧 primary（推进）
 * - custom → 按显式 variant 归侧（primary 归右，其余归左）
 *
 * 刻意不提供 back：返回属头部职责（PageHeader.onBack，法则表·导航·返回）。
 */
export type FormFooterActionKind =
  | "cancel"
  | "save-draft"
  | "previous"
  | "next"
  | "submit"
  | "custom"

export interface FormFooterAction {
  kind: FormFooterActionKind
  /** 按钮文案 */
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  /** 仅 custom 需要：default/highlight 归右侧（推进），其余归左侧 */
  variant?: "default" | "highlight" | "outline" | "secondary" | "ghost" | "destructive"
  /** 提交类默认 submit（触发外层 form）；custom 可显式指定 */
  type?: "button" | "submit"
}

export interface FormFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 左对齐内容（如取消、返回按钮）——与 actions 互斥，同时传开发期告警 */
  left?: React.ReactNode
  /**
   * 吸底：长表单滚动时操作栏恒在视口内（ENG-FE-DESIGN-005 D1=C 裁决）。
   * 方言采纳全仓手写 sticky 栏的实战形态（负边距扩展 + /95 毛玻璃 + z-10），
   * 收编存量后即为唯一合法实现（004 §3.2 禁止手写 sticky 底栏）。
   * 组件级默认关；模板（WizardPage）默认传 true，页面可 opt-out。
   */
  sticky?: boolean
  /** 右对齐内容（如提交按钮），默认居右——与 actions 互斥 */
  children?: React.ReactNode
  /**
   * 声明式动作清单（D2，005 §4.2）——位置/形态由法则表内建，页面零自由度。
   * 语义审计内建：① submit 而无 cancel → 告警（编辑态成对取消，004 §4）；
   * ② actions 与 left/children 混用 → 告警。
   * 存量 left/children 用法继续兼容、不强制迁移。
   */
  actions?: FormFooterAction[]
}

// dev 判定沿用 shared-ui logger 惯例：import.meta 局部断言（vite-env.d.ts 刻意
// 最小集，不引 node types——process 在此不可用，CI data-platform build 实证）
const devWarn = (message: string) => {
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true) {
    console.warn(`[FormFooter] ${message}`)
  }
}

const isPrimaryKind = (a: FormFooterAction) =>
  a.variant === "default" || a.variant === "highlight" || a.kind === "next" || a.kind === "submit"

const actionToButton = (a: FormFooterAction, i: number) => (
  <Button
    key={`${a.kind}-${i}`}
    type={a.type ?? (a.kind === "submit" ? "submit" : "button")}
    variant={
      a.variant ??
      (a.kind === "next" || a.kind === "submit" ? "default" : "outline")
    }
    onClick={a.onClick}
    disabled={a.disabled}
    loading={a.loading}
  >
    {a.icon}
    {a.label}
  </Button>
)

/**
 * 表单底部操作栏
 *
 * 两种用法（互斥）：
 * 1. 声明式（推荐，D2）：actions 清单——位置/形态由法则表内建；
 *    编辑态成对取消自动审计。
 * 2. 经典插槽：left + children（存量兼容，不强制迁移）。
 *
 * @example 声明式
 *   <FormFooter
 *     sticky
 *     actions={[
 *       { kind: "cancel", label: "取消", onClick: onCancel },
 *       { kind: "save-draft", label: "保存草稿", onClick: onSaveDraft },
 *       { kind: "submit", label: "保存", onClick: onSave, loading: saving },
 *     ]}
 *   />
 *
 * @example 经典插槽（存量兼容）
 *   <FormFooter left={<Button variant="outline">取消</Button>}>
 *     <Button type="submit">保存</Button>
 *   </FormFooter>
 */
export function FormFooter({
  left,
  sticky = false,
  children,
  actions,
  className,
  ...props
}: FormFooterProps) {
  const declarative = Boolean(actions?.length)

  if (declarative) {
    if (left || children) {
      devWarn("actions 与 left/children 互斥——请只用一种用法（声明式优先）")
    }
    const list = actions ?? []
    if (list.some((a) => a.kind === "submit") && !list.some((a) => a.kind === "cancel")) {
      devWarn("编辑态必须成对提供「取消」（004 §4 放弃类）——actions 缺 cancel")
    }
    const leftActions = list.filter((a) => !isPrimaryKind(a))
    const rightActions = list.filter(isPrimaryKind)
    return (
      <div
        className={cn(
          "flex items-center justify-between pt-6 border-t",
          sticky &&
            "sticky bottom-0 z-10 -mx-4 px-4 md:-mx-6 md:px-6 bg-background/95 backdrop-blur",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          {leftActions.map(actionToButton)}
        </div>
        <div className="flex items-center gap-2">
          {rightActions.map(actionToButton)}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between pt-6 border-t",
        sticky &&
          "sticky bottom-0 z-10 -mx-4 px-4 md:-mx-6 md:px-6 bg-background/95 backdrop-blur",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {left}
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  )
}
