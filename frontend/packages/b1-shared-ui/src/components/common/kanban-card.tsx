import * as React from 'react';
import { cn } from "cn";
import { Card } from '../ui/card';
import { DotsSixVertical } from "@phosphor-icons/react";
import { useDraggable } from '@dnd-kit/core';

export interface KanbanCardProps {
  children: React.ReactNode;
  /** dnd-kit 拖拽 id；draggable=true 时必填 */
  id?: string;
  /** 是否可拖拽，默认 false（纯展示）。dnd-kit 唯一拖拽引擎（ENG-FE-DESIGN-004 §3.4），
   *  可拖拽须处于页面级 DndContext 内；无 DndContext 时 hook 返回 inert 值，纯展示安全 */
  draggable?: boolean;
  /** 透传 useDraggable disabled（如仅特定状态可拖） */
  disabled?: boolean;
  /** 透传 useDraggable data；onDragEnd 时经 active.data.current 读取业务字段 */
  data?: Record<string, unknown>;
  /** 外部覆盖拖拽中视觉（DragOverlay 场景手动传）；与内部 isDragging 合并 */
  isDragging?: boolean;
  /** 是否显示拖拽手柄（纯视觉；dnd-kit listeners 绑整卡） */
  showDragHandle?: boolean;
  /** 拖拽手柄位置：left 或 right */
  dragHandlePosition?: 'left' | 'right';
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 左边框颜色 */
  borderColor?: string;
  /** 悬停时是否显示阴影，默认为 true */
  hoverShadow?: boolean;
}

/** 拖拽手柄子组件（定义在模块作用域，避免在渲染函数中创建组件） */
function DragHandle({ position }: { position: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing',
        position === 'left' ? 'mr-2' : 'ml-2'
      )}
    >
      <DotsSixVertical className="h-4 w-4" />
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  /** 拖拽中视觉（原位降透明；指针跟随交给页面的 DragOverlay） */
  dragging: boolean;
  /** 可拖拽语义视觉（cursor-grab）；dnd-kit 交互 props 由此分支展开 */
  interactive: boolean;
  dndProps?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  setNodeRef?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  className?: string;
  borderColor?: string;
  hoverShadow: boolean;
  showDragHandle: boolean;
  dragHandlePosition: 'left' | 'right';
}

function CardBody({
  children,
  dragging,
  interactive,
  dndProps,
  setNodeRef,
  onClick,
  className,
  borderColor,
  hoverShadow,
  showDragHandle,
  dragHandlePosition,
}: CardBodyProps) {
  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'relative p-3 transition-all border-l-4',
        interactive && 'cursor-grab active:cursor-grabbing',
        !interactive && 'cursor-default',
        hoverShadow && 'hover:shadow-md',
        dragging && 'opacity-50',
        className
      )}
      style={{ borderLeftColor: borderColor || 'var(--primary)' }}
      onClick={onClick}
      {...dndProps}
    >
      <div className="flex items-start">
        {showDragHandle && dragHandlePosition === 'left' && <DragHandle position="left" />}
        <div className="flex-1 min-w-0">{children}</div>
        {showDragHandle && dragHandlePosition === 'right' && <DragHandle position="right" />}
      </div>
    </Card>
  );
}

export function KanbanCard(props: KanbanCardProps) {
  // 组件分支（而非 hook 条件调用）：hook 各自在子组件内无条件调用，满足 rules-of-hooks
  return props.draggable ? <DraggableCard {...props} /> : <StaticCard {...props} />;
}

function DraggableCard({
  children,
  id,
  disabled,
  data,
  isDragging: isDraggingProp,
  showDragHandle = false,
  dragHandlePosition = 'left',
  onClick,
  className,
  borderColor,
  hoverShadow = true,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id!,
    disabled,
    data,
  });
  return (
    <CardBody
      dragging={isDragging || Boolean(isDraggingProp)}
      interactive={!disabled}
      dndProps={{ ...listeners, ...attributes }}
      setNodeRef={setNodeRef}
      onClick={onClick}
      className={className}
      borderColor={borderColor}
      hoverShadow={hoverShadow}
      showDragHandle={showDragHandle}
      dragHandlePosition={dragHandlePosition}
    >
      {children}
    </CardBody>
  );
}

function StaticCard({
  children,
  isDragging: isDraggingProp,
  showDragHandle = false,
  dragHandlePosition = 'left',
  onClick,
  className,
  borderColor,
  hoverShadow = true,
}: KanbanCardProps) {
  return (
    <CardBody
      dragging={Boolean(isDraggingProp)}
      interactive={false}
      onClick={onClick}
      className={className}
      borderColor={borderColor}
      hoverShadow={hoverShadow}
      showDragHandle={showDragHandle}
      dragHandlePosition={dragHandlePosition}
    >
      {children}
    </CardBody>
  );
}
