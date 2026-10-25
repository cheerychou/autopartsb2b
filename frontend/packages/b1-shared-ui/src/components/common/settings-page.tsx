import * as React from "react"
import { cn } from "cn"
import { PageContainer } from "./page-container"
import { PageHeader } from "./page-header"
import { Button } from "../ui/button"

export interface SettingsPageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 页面标题（唯一标题通道，壳内渲染 PageHeader，禁止页面手写 h1） */
  title: string
  /** 实体身份元信息（门店类型/编码等），标题右侧灰字；准入见 PAGE_HEADER_USAGE.md ②类 */
  subtitle?: string
  /** 标题旁说明，同行左右结构；写法准入见 PAGE_HEADER_USAGE.md */
  description?: string
  /** 面包屑项，渲染在标题行上方 */
  breadcrumbItems?: Array<{ label: string; href?: string }>
  /** 返回按钮回调（三定律 1：返回固定在标题左侧，禁止占底部） */
  onBack?: () => void
  /**
   * 编辑模式：'edit' 时右上角不渲染「编辑」按钮（保存/取消由页面以底部
   * FormFooter 承载，规范见 ENG-FE-DESIGN-004 §2 按钮三定律）；
   * 不传 = 纯只读页，永不渲染「编辑」
   */
  mode?: "view" | "edit"
  /** 「编辑」按钮回调（view 态右上角渲染）；不传且无 action 时右上角为空 */
  onEdit?: () => void
  /** 查看态右上角自定义操作，排在「编辑」按钮左侧 */
  action?: React.ReactNode
  /** 页面内容（Form / FormSection / FormFooter 由页面按 ENG-FE-DESIGN-004 组合） */
  children: React.ReactNode
}

/**
 * 设置页布局壳（页面分类学 settings 类的唯一骨架，
 * 规范见 docs/frontend/design/ENG-FE-DESIGN-004-page-taxonomy-and-settings-template.md）
 *
 * 适用：低频修改 × 高价值参数——个人信息、偏好、门店信息、规则参数等。
 * 只编排布局，不新增逻辑（与 StandardListPage 同一判定准则）：
 * 1. 容器宽度焊死 `w-full max-w-detail mx-auto`——PageContainer 为 flex 纵向容器，
 *    子项 mx-auto 会失去 stretch 收缩为内容自适应宽，w-full 必须显式（实测 382px 事故）；
 * 2. 标题走 PageHeader 唯一通道（CI Rule 11）；
 * 3. 「编辑」入口固定右上角（仅 view 态）；
 * 4. 保存/取消归口底部 FormFooter（页面编辑态渲染，位置由规范约束）。
 *
 * @example 查看/编辑双模式
 *   <SettingsPage title="门店信息" mode={mode} onEdit={() => setMode('edit')}>
 *     <Form ...>
 *       <FormSection title="基本信息" columns={2}>...</FormSection>
 *       {mode === 'edit' && (
 *         <FormFooter>
 *           <Button type="button" variant="outline" onClick={() => setMode('view')}>取消</Button>
 *           <Button type="submit">保存</Button>
 *         </FormFooter>
 *       )}
 *     </Form>
 *   </SettingsPage>
 *
 * @example 纯只读
 *   <SettingsPage title="个人信息">
 *     <FormSection title="基本信息"><InfoField ... /></FormSection>
 *   </SettingsPage>
 */
export function SettingsPage({
  title,
  subtitle,
  description,
  breadcrumbItems,
  onBack,
  mode,
  onEdit,
  action,
  children,
  className,
  ...props
}: SettingsPageProps) {
  const isEdit = mode === "edit"
  const headerAction =
    !isEdit && (onEdit || action) ? (
      <>
        {action}
        {onEdit && <Button onClick={onEdit}>编辑</Button>}
      </>
    ) : (
      action
    )

  return (
    <PageContainer className={cn(className)} {...props}>
      <div className="w-full max-w-detail mx-auto space-y-6">
        <PageHeader
          title={title}
          subtitle={subtitle}
          description={description}
          breadcrumbItems={breadcrumbItems}
          onBack={onBack}
          action={headerAction}
        />
        {children}
      </div>
    </PageContainer>
  )
}
