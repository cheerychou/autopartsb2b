/**
 * 共享领域类型定义
 * 定义后端 API 契约级别的枚举和常量，供 web 和 mobile 共同使用
 *
 * 形态约定（2026-08-29 定案，ArkTS 兼容性实测驱动）：
 * - 枚举类型一律 union 直写，不用 `as const` 对象 + `typeof` 推导
 *   （ArkTS 禁用 as-const/type-query/同名 const+type 合并，Spike 报价单 37 错的来源，
 *   见 KNW-MOB-002 L-ARCH-002）
 * - 值访问对象与类型分名（ORDER_STATUSES / WORK_ORDER_STATUSES，复数避让
 *   status-config 的同名 UI 配置），成员显式标注精确字面量类型
 * - LABELS 一律显式 interface + 标识符键（ArkTS 禁计算属性键，Record 注解不被视为
 *   显式 interface）
 * - 新增枚举值时须同步补值对象成员与 LABELS 键，穷尽性由 __tests__/domain.test.ts 兜底
 */

// ── 订单状态 ──

export type OrderStatus =
  | "reception"
  | "pending_inspection"
  | "inspecting"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "pending_settlement"
  | "settled"
  | "pending_payment"
  | "delivered"
  | "cancelled";

// 值访问对象（与类型分名，ArkTS 不允许 const 与 type 同名声明合并）。
// 成员标注精确字面量类型——保证 `[ORDER_STATUSES.X]` 计算键仍推断为字面量键。
export interface OrderStatusConst {
  RECEPTION: "reception";
  PENDING_INSPECTION: "pending_inspection";
  INSPECTING: "inspecting";
  PENDING: "pending";
  CONFIRMED: "confirmed";
  IN_PROGRESS: "in_progress";
  PENDING_SETTLEMENT: "pending_settlement";
  SETTLED: "settled";
  PENDING_PAYMENT: "pending_payment";
  DELIVERED: "delivered";
  CANCELLED: "cancelled";
}

export const ORDER_STATUSES: OrderStatusConst = {
  RECEPTION: "reception",
  PENDING_INSPECTION: "pending_inspection",
  INSPECTING: "inspecting",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  PENDING_SETTLEMENT: "pending_settlement",
  SETTLED: "settled",
  PENDING_PAYMENT: "pending_payment",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export interface OrderStatusLabels {
  reception: string;
  pending_inspection: string;
  inspecting: string;
  pending: string;
  confirmed: string;
  in_progress: string;
  pending_settlement: string;
  settled: string;
  pending_payment: string;
  delivered: string;
  cancelled: string;
}

export const ORDER_STATUS_LABELS: OrderStatusLabels = {
  reception: "接待中",
  pending_inspection: "待检查",
  inspecting: "检查中",
  pending: "待确认",
  confirmed: "已确认",
  in_progress: "施工中",
  pending_settlement: "待结算",
  settled: "已结算",
  pending_payment: "待收款",
  delivered: "已交车",
  cancelled: "已取消",
};

// ── 工单状态 ──

export type WorkOrderStatus =
  | "pending_dispatch"
  | "assigned"
  | "pending_material"
  | "material_received"
  | "working"
  | "quality_check"
  | "completed"
  | "cancelled"
  | "on_hold";

// 值访问对象（与类型分名；复数命名避让 status-config 的 WORK_ORDER_STATUS UI 配置）
export interface WorkOrderStatusConst {
  PENDING_DISPATCH: "pending_dispatch";
  ASSIGNED: "assigned";
  PENDING_MATERIAL: "pending_material";
  MATERIAL_RECEIVED: "material_received";
  WORKING: "working";
  QUALITY_CHECK: "quality_check";
  COMPLETED: "completed";
  CANCELLED: "cancelled";
  ON_HOLD: "on_hold";
}

export const WORK_ORDER_STATUSES: WorkOrderStatusConst = {
  PENDING_DISPATCH: "pending_dispatch",
  ASSIGNED: "assigned",
  PENDING_MATERIAL: "pending_material",
  MATERIAL_RECEIVED: "material_received",
  WORKING: "working",
  QUALITY_CHECK: "quality_check",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  ON_HOLD: "on_hold",
};

export interface WorkOrderStatusLabels {
  pending_dispatch: string;
  assigned: string;
  pending_material: string;
  material_received: string;
  working: string;
  quality_check: string;
  completed: string;
  cancelled: string;
  on_hold: string;
}

export const WORK_ORDER_STATUS_LABELS: WorkOrderStatusLabels = {
  pending_dispatch: "待派工",
  assigned: "已派工",
  pending_material: "待领料",
  material_received: "已领料",
  working: "施工中",
  quality_check: "质检中",
  completed: "已完成",
  cancelled: "已取消",
  on_hold: "暂停",
};

// ── 工单优先级 ──

export type WorkOrderPriority = "low" | "normal" | "high" | "urgent";

export interface WorkOrderPriorityLabels {
  low: string;
  normal: string;
  high: string;
  urgent: string;
}

export const WORK_ORDER_PRIORITY_LABELS: WorkOrderPriorityLabels = {
  low: "低",
  normal: "普通",
  high: "高",
  urgent: "紧急",
};
