import * as React from 'react'
import { Plus } from "@phosphor-icons/react";
import { CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

/**
 * 可编辑卡片头部组件
 *
 * 提供统一的"标题 + 右侧添加按钮"布局模式，
 * 用于工时项目、配件项目、费用项、检查项等可编辑列表卡片的头部。
 *
 * @example
 * ```tsx
 * <Card>
 *   <EditableCardHeader
 *     icon={<Wrench className="h-4 w-4 text-primary" />}
 *     title="工时项目"
 *     onAdd={handleAdd}
 *     addLabel="添加"
 *   />
 *   <CardContent>...</CardContent>
 * </Card>
 * ```
 */

export interface EditableCardHeaderProps {
  /** 标题文字 */
  title: string
  /** 标题左侧图标 */
  icon?: React.ReactNode
  /** 点击添加按钮的回调 */
  onAdd?: () => void
  /** 添加按钮文字，默认"添加" */
  addLabel?: string
  /** 是否隐藏添加按钮 */
  hideAddButton?: boolean
  /** 右侧额外操作区域（添加按钮左侧） */
  extraActions?: React.ReactNode
  /** 标题右侧的补充描述 */
  description?: string
}

export function EditableCardHeader({
  title,
  icon,
  onAdd,
  addLabel = '添加',
  hideAddButton = false,
  extraActions,
  description,
}: EditableCardHeaderProps) {
  return (
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          {description && (
            <span className="text-sm font-normal text-muted-foreground">{description}</span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {extraActions}
          {!hideAddButton && onAdd && (
            <Button variant="outline" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>
    </CardHeader>
  )
}
