import * as React from "react"
import { cn } from "cn"

export interface KanbanBoardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 看板列（KanbanColumn 列表）；列宽/空态/骨架由列自管，Board 只负责横向排布与滚动 */
  children: React.ReactNode
}

/**
 * 看板容器（taxonomy §2.13 看板页 / §2.1 列表页看板认可变体 的列排布归口，
 * 规范见 docs/frontend/design/ENG-FE-DESIGN-004 §3.4）。
 *
 * 薄容器三件事：列横排（flex）+ 横向溢出滚动（overflow-x-auto）+ 统一列距与等高
 * （gap-4 items-stretch）。只编排布局不做逻辑：拖拽引擎统一为 dnd-kit（页面级
 * DndContext + onDragEnd），列/卡片的协议见 KanbanColumn / KanbanCard。
 *
 * @example 状态列看板
 *   <DndContext onDragEnd={handleDragEnd}>
 *     <KanbanBoard>
 *       {STATUS_COLUMNS.map(col => (
 *         <KanbanColumn key={col.key} id={col.key} droppable title={col.label}
 *           count={grouped[col.key].length} statusColor={col.color}>
 *           {grouped[col.key].map(item => (
 *             <KanbanCard key={item.id} id={item.id} draggable data={{ orderId: item.id }}>
 *               ...
 *             </KanbanCard>
 *           ))}
 *         </KanbanColumn>
 *       ))}
 *     </KanbanBoard>
 *   </DndContext>
 */
export function KanbanBoard({ children, className, ...props }: KanbanBoardProps) {
  return (
    <div
      className={cn("flex items-stretch gap-4 overflow-x-auto pb-2 min-w-max", className)}
      {...props}
    >
      {children}
    </div>
  )
}
