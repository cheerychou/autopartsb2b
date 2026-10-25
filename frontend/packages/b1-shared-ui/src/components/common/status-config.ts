/**
 * 业务状态统一配置映射
 * 集中管理所有业务实体的状态到 StatusBadge tone 的映射
 * 确保全应用状态显示一致性
 */

import type { StatusTone } from '../ui/status-badge';

export interface StatusConfig {
  label: string;
  tone: StatusTone;
}

export type StatusMap<T extends string = string> = Record<T, StatusConfig>;

/** 通用启用/停用状态 */
export const ACTIVE_INACTIVE_STATUS: StatusMap<'active' | 'inactive'> = {
  active: { label: '正常', tone: 'success' },
  inactive: { label: '停用', tone: 'default' },
};

/** 配件状态（含淘汰） */
export const PART_STATUS: StatusMap<'active' | 'inactive' | 'discontinued'> = {
  active: { label: '正常', tone: 'success' },
  inactive: { label: '停用', tone: 'default' },
  discontinued: { label: '淘汰', tone: 'danger' },
};

/** 库存状态 */
export const INVENTORY_STATUS: StatusMap<'in-stock' | 'low-stock' | 'out-of-stock'> = {
  'in-stock': { label: '正常', tone: 'success' },
  'low-stock': { label: '低库存', tone: 'warning' },
  'out-of-stock': { label: '缺货', tone: 'danger' },
};

/** 库存预警状态（简化版） */
export const STOCK_LEVEL_STATUS: StatusMap<'normal' | 'warning' | 'low'> = {
  normal: { label: '正常', tone: 'success' },
  warning: { label: '偏低', tone: 'warning' },
  low: { label: '缺货', tone: 'danger' },
};

/** 调拨单状态 */
export const TRANSFER_ORDER_STATUS: StatusMap<'pending' | 'approved' | 'transferring' | 'completed' | 'cancelled'> = {
  pending: { label: '待审批', tone: 'warning' },
  approved: { label: '已批准', tone: 'info' },
  transferring: { label: '调拨中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 根据状态映射获取 StatusBadge 配置 */
export function getStatusConfig<T extends string>(
  statusMap: StatusMap<T>,
  status: string,
): StatusConfig | undefined {
  return statusMap[status as T];
}

/** 采购申请状态 */
export const PROCUREMENT_REQUEST_STATUS: StatusMap<'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'> = {
  pending: { label: '待审批', tone: 'warning' },
  approved: { label: '已批准', tone: 'success' },
  rejected: { label: '已拒绝', tone: 'danger' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 采购退货状态 */
export const PROCUREMENT_RETURN_STATUS: StatusMap<'pending' | 'approved' | 'completed' | 'cancelled'> = {
  pending: { label: '待审批', tone: 'warning' },
  approved: { label: '已批准', tone: 'success' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 结算单状态 */
export const SETTLEMENT_STATUS: StatusMap<'pending' | 'partial' | 'paid' | 'cancelled'> = {
  pending: { label: '未结算', tone: 'warning' },
  partial: { label: '部分结算', tone: 'info' },
  paid: { label: '已结算', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 收支记录状态 */
export const FINANCE_RECORD_STATUS: StatusMap<'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'> = {
  pending: { label: '待处理', tone: 'warning' },
  completed: { label: '已完成', tone: 'success' },
  failed: { label: '失败', tone: 'danger' },
  refunded: { label: '已退款', tone: 'info' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 工单状态（9 态，对齐后端 store_services/workshop/models.py WorkOrderStatus / C8008；
 *  2026-10-09 §4.4-1 拍板：废除旧 5 态异键（waiting_parts 为后端不存在的幽灵键）） */
export const WORK_ORDER_STATUS: StatusMap<
  | 'pending_dispatch'
  | 'assigned'
  | 'pending_material'
  | 'material_received'
  | 'working'
  | 'quality_check'
  | 'completed'
  | 'cancelled'
  | 'on_hold'
> = {
  pending_dispatch: { label: '待派工', tone: 'warning' },
  assigned: { label: '已派工', tone: 'info' },
  pending_material: { label: '待领料', tone: 'warning' },
  material_received: { label: '已领料', tone: 'info' },
  working: { label: '施工中', tone: 'info' },
  quality_check: { label: '质检中', tone: 'warning' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
  on_hold: { label: '暂停', tone: 'danger' },
};

/** 预约状态（后端 store_services/core/appointments/models.py Appointment.STATUS_CHOICES；
 *  2026-10-11 P0-3 批5 真值修正：删幽灵键 in_service/no_show——后端无此值，补 arrived） */
export const APPOINTMENT_STATUS: StatusMap<'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled'> = {
  pending: { label: '待确认', tone: 'warning' },
  confirmed: { label: '已确认', tone: 'info' },
  arrived: { label: '已到店', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 盘点单状态（后端 store_services/warehouse/models.py StockCountStatus；
 *  2026-10-11 批5 真值修正：首键 pending→planning，后端无 pending 态） */
export const STOCKTAKE_STATUS: StatusMap<'planning' | 'in_progress' | 'completed' | 'cancelled'> = {
  planning: { label: '计划中', tone: 'warning' },
  in_progress: { label: '盘点中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 仓库单据状态（后端 store_services/warehouse/models.py DocumentStatus，出入库/调拨
 *  共用 InventoryTransaction.status；2026-10-11 P0-3 批5 真值修正——原 INBOUND_STATUS/
 *  OUTBOUND_STATUS 两套键系臆造（received/picking/shipped 等后端不存在），合并归一） */
export const WAREHOUSE_DOC_STATUS: StatusMap<'draft' | 'pending' | 'approved' | 'in_transit' | 'executed' | 'cancelled'> = {
  draft: { label: '草稿', tone: 'default' },
  pending: { label: '待审核', tone: 'warning' },
  approved: { label: '已审核', tone: 'info' },
  in_transit: { label: '在途', tone: 'info' },
  executed: { label: '已执行', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 采购订单状态 */
export const PURCHASE_ORDER_STATUS: StatusMap<'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'completed' | 'cancelled'> = {
  draft: { label: '草稿', tone: 'default' },
  pending: { label: '待审批', tone: 'warning' },
  approved: { label: '已批准', tone: 'success' },
  ordered: { label: '已下单', tone: 'info' },
  received: { label: '已收货', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 支付记录状态 */
export const PAYMENT_STATUS: StatusMap<'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'> = {
  pending: { label: '待支付', tone: 'warning' },
  processing: { label: '处理中', tone: 'info' },
  completed: { label: '已支付', tone: 'success' },
  failed: { label: '支付失败', tone: 'danger' },
  refunded: { label: '已退款', tone: 'info' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 收款记录状态 */
export const RECEIPT_STATUS: StatusMap<'pending' | 'confirmed' | 'completed' | 'failed' | 'refunded' | 'cancelled'> = {
  pending: { label: '待收款', tone: 'warning' },
  confirmed: { label: '已确认', tone: 'info' },
  completed: { label: '已收款', tone: 'success' },
  failed: { label: '收款失败', tone: 'danger' },
  refunded: { label: '已退款', tone: 'info' },
  cancelled: { label: '已取消', tone: 'default' },
};

// ── data-platform severity（2026-10-09 §4.4-2 拍板：键跟后端真值走、视觉归一口，
// 三域枚举互不相同系后端各自设计，禁止跨域混用配置）──

/** 数据质量规则严重级别（后端 data_platform/models_system.py SEVERITY_LEVEL_CHOICES） */
export const SEVERITY_QUALITY: StatusMap<'low' | 'medium' | 'high' | 'critical'> = {
  low: { label: '低', tone: 'default' },
  medium: { label: '中', tone: 'info' },
  high: { label: '高', tone: 'warning' },
  critical: { label: '严重', tone: 'danger' },
};

/** DTC/知识库严重程度（后端 data_platform/models_dtc.py 与 models_knowledge.py） */
export const SEVERITY_DTC: StatusMap<'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO'> = {
  CRITICAL: { label: '严重', tone: 'danger' },
  MAJOR: { label: '主要', tone: 'warning' },
  MINOR: { label: '次要', tone: 'info' },
  INFO: { label: '信息', tone: 'default' },
};

/** 维修案例故障严重程度（后端 data_platform/models_repair_case.py） */
export const SEVERITY_REPAIR_CASE: StatusMap<'minor' | 'moderate' | 'major' | 'critical'> = {
  minor: { label: '轻微', tone: 'default' },
  moderate: { label: '一般', tone: 'info' },
  major: { label: '严重', tone: 'warning' },
  critical: { label: '紧急', tone: 'danger' },
};

// ── data-platform 主数据生命周期（2026-10-11 P0-3 批1：镜像后端 data_platform/choices.py
// STATUS_CHOICES 单一真值——dp 各模型共享的 5 态枚举；此前 30 文件各自定义 STATUS_COLORS
// 存在 ≥3 套互相矛盾色板（ADT-ALL-004 §P0-3 视觉漂移实证），统一收敛到此）──

/** dp 主数据通用生命周期：草稿/待审核/启用/停用/归档（后端 data_platform/choices.py STATUS_CHOICES） */
export const DP_RECORD_STATUS: StatusMap<'draft' | 'pending' | 'active' | 'inactive' | 'archived'> = {
  draft: { label: '草稿', tone: 'warning' },
  pending: { label: '待审核', tone: 'info' },
  active: { label: '启用', tone: 'success' },
  inactive: { label: '停用', tone: 'default' },
  archived: { label: '归档', tone: 'default' },
};

/** dp 车型域生命周期：草稿/启用/停用（后端 data_platform/models.py VehicleModel.STATUS_CHOICES，
 *  models/submodels 两端点共用；车型无 pending 态，与 5 态 DP_RECORD_STATUS 互斥禁混用——P0-3 批2） */
export const DP_MODEL_STATUS: StatusMap<'draft' | 'active' | 'inactive'> = {
  draft: { label: '草稿', tone: 'warning' },
  active: { label: '启用', tone: 'success' },
  inactive: { label: '停用', tone: 'default' },
};

// ── data-platform 域特有枚举（2026-10-11 P0-3 批3：键与标签全部镜像后端各模型真值，
// 各域枚举互不相同系后端各自设计，禁止跨域混用配置）──

/** 行业术语状态（后端 data_platform/models_terminology.py IndustryTerm.STATUS_CHOICES） */
export const TERM_INDUSTRY_STATUS: StatusMap<'draft' | 'active' | 'deprecated' | 'replaced_by'> = {
  draft: { label: '草稿', tone: 'warning' },
  active: { label: '启用', tone: 'success' },
  deprecated: { label: '已废弃', tone: 'default' },
  replaced_by: { label: '已被替代', tone: 'info' },
};

/** 术语别名状态（后端 data_platform/models_terminology.py TermAlias.STATUS_CHOICES） */
export const TERM_ALIAS_STATUS: StatusMap<'active' | 'deprecated'> = {
  active: { label: '启用', tone: 'success' },
  deprecated: { label: '已废弃', tone: 'default' },
};

/** 国标状态（后端 data_platform/models_terminology.py NationalStandard.STATUS_CHOICES） */
export const NATIONAL_STANDARD_STATUS: StatusMap<'current' | 'replaced' | 'abolished'> = {
  current: { label: '现行', tone: 'success' },
  replaced: { label: '被替代', tone: 'warning' },
  abolished: { label: '废止', tone: 'default' },
};

/** OEM 授权许可状态（后端 data_platform/models_oem.py OEMLicense.STATUS_CHOICES） */
export const OEM_LICENSE_STATUS: StatusMap<'draft' | 'active' | 'suspended' | 'expired' | 'terminated'> = {
  draft: { label: '草稿', tone: 'default' },
  active: { label: '生效中', tone: 'success' },
  suspended: { label: '暂停', tone: 'warning' },
  expired: { label: '已过期', tone: 'warning' },
  terminated: { label: '已终止', tone: 'danger' },
};

/** OEM 数据源状态（后端 data_platform/models_oem.py OEMDataSource.STATUS_CHOICES） */
export const OEM_DATA_SOURCE_STATUS: StatusMap<'active' | 'inactive' | 'error' | 'maintenance'> = {
  active: { label: '正常', tone: 'success' },
  inactive: { label: '停用', tone: 'default' },
  error: { label: '异常', tone: 'danger' },
  maintenance: { label: '维护中', tone: 'warning' },
};

/** OEM 数据访问凭证状态（后端 data_platform/models_oem.py OEMDataAccess.STATUS_CHOICES） */
export const OEM_DATA_ACCESS_STATUS: StatusMap<'active' | 'revoked' | 'expired'> = {
  active: { label: '正常', tone: 'success' },
  revoked: { label: '已撤销', tone: 'danger' },
  expired: { label: '已过期', tone: 'warning' },
};

/** SPU 适配关系验证状态（后端 data_platform/models_fitment.py SPUFitment.verified_status；
 *  2026-10-11 批3 标签漂移归一：工作台「已采信/争议→后端真值 已验证/有争议） */
export const FITMENT_VERIFIED_STATUS: StatusMap<'unverified' | 'verified' | 'disputed'> = {
  unverified: { label: '未验证', tone: 'default' },
  verified: { label: '已验证', tone: 'success' },
  disputed: { label: '有争议', tone: 'danger' },
};

/** 适配验证批次状态（后端 data_platform/models_fitment.py FitmentValidationBatch.STATUS_CHOICES） */
export const FITMENT_BATCH_STATUS: StatusMap<'reviewing' | 'concluded' | 'cancelled'> = {
  reviewing: { label: '验证中', tone: 'warning' },
  concluded: { label: '已结论', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 企业合作状态（后端 data_platform/models_enterprise.py Enterprise.COOPERATION_STATUS_CHOICES） */
export const COOPERATION_STATUS: StatusMap<'active' | 'suspended' | 'terminated' | 'pending'> = {
  active: { label: '合作中', tone: 'success' },
  suspended: { label: '暂停合作', tone: 'warning' },
  terminated: { label: '终止合作', tone: 'danger' },
  pending: { label: '待合作', tone: 'default' },
};

/** 维修案例状态（后端 data_platform/models_repair_case.py RepairCase.STATUS_CHOICES，7 态审核流） */
export const REPAIR_CASE_STATUS: StatusMap<
  'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published' | 'archived'
> = {
  draft: { label: '草稿', tone: 'default' },
  submitted: { label: '已提交', tone: 'info' },
  under_review: { label: '审核中', tone: 'warning' },
  approved: { label: '已通过', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' },
  published: { label: '已发布', tone: 'success' },
  archived: { label: '已归档', tone: 'default' },
};

/** 数据审核状态（后端 data_platform/models_governance.py DataApproval.APPROVAL_STATUS_CHOICES） */
export const QUALITY_APPROVAL_STATUS: StatusMap<'pending' | 'approved' | 'rejected' | 'auto_approved'> = {
  pending: { label: '待审核', tone: 'warning' },
  approved: { label: '已通过', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' },
  auto_approved: { label: '自动通过', tone: 'info' },
};

/** 数据异常状态（后端 data_platform/models_governance.py DataAnomaly.ANOMALY_STATUS_CHOICES） */
export const ANOMALY_STATUS: StatusMap<'pending' | 'confirmed' | 'resolved' | 'ignored'> = {
  pending: { label: '待处理', tone: 'warning' },
  confirmed: { label: '已确认', tone: 'warning' },
  resolved: { label: '已解决', tone: 'success' },
  ignored: { label: '已忽略', tone: 'default' },
};

/** 数据同步任务状态（后端 data_platform/models_sync.py SyncTask.TASK_STATUS_CHOICES；
 *  2026-10-11 批3 标签漂移归一：就绪→后端真值 空闲） */
export const SYNC_TASK_STATUS: StatusMap<'idle' | 'running' | 'paused' | 'failed' | 'completed'> = {
  idle: { label: '空闲', tone: 'default' },
  running: { label: '运行中', tone: 'info' },
  paused: { label: '已暂停', tone: 'warning' },
  failed: { label: '失败', tone: 'danger' },
  completed: { label: '已完成', tone: 'success' },
};

/** 数据同步记录状态（后端 data_platform/models_sync.py SyncRecord.RECORD_STATUS_CHOICES） */
export const SYNC_RECORD_STATUS: StatusMap<'pending' | 'running' | 'success' | 'failed' | 'partial_success' | 'cancelled'> = {
  pending: { label: '待执行', tone: 'warning' },
  running: { label: '执行中', tone: 'info' },
  success: { label: '成功', tone: 'success' },
  failed: { label: '失败', tone: 'danger' },
  partial_success: { label: '部分成功', tone: 'warning' },
  cancelled: { label: '已取消', tone: 'default' },
};

// ── platform-web 平台域枚举（2026-10-11 P0-3 批4：键与标签全部镜像后端真值——
// shared/user_management + cdd_platform 各模型 STATUS_CHOICES；漂移标签归一、
// 前端幽灵键（后端不存在的值）已删除，禁止跨域混用配置）──

/** 租户状态（后端 shared/user_management/models.py Tenant.STATUS_CHOICES；
 *  前端幽灵键 expired 已删——后端无此值，无任何写入路径） */
export const TENANT_STATUS: StatusMap<'active' | 'trial' | 'suspended' | 'inactive'> = {
  active: { label: '激活', tone: 'success' },
  trial: { label: '试用', tone: 'warning' },
  suspended: { label: '暂停', tone: 'danger' },
  inactive: { label: '停用', tone: 'default' },
};

/** 平台用户状态（后端 shared/user_management/models.py User.STATUS_CHOICES；
 *  前端幽灵键 pending/suspended 已删，补缺失的 locked） */
export const PLATFORM_USER_STATUS: StatusMap<'active' | 'inactive' | 'locked'> = {
  active: { label: '激活', tone: 'success' },
  inactive: { label: '停用', tone: 'default' },
  locked: { label: '锁定', tone: 'danger' },
};

/** 销售线索状态（后端 cdd_platform/sales/models.py Lead.STATUS_CHOICES；
 *  前端幽灵键 lost 已删） */
export const LEAD_STATUS: StatusMap<'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'> = {
  new: { label: '新建', tone: 'info' },
  contacted: { label: '已联系', tone: 'warning' },
  qualified: { label: '合格', tone: 'success' },
  unqualified: { label: '不合格', tone: 'danger' },
  converted: { label: '已转化', tone: 'success' },
};

/** 销售合同状态（后端 cdd_platform/sales/models.py Contract.STATUS_CHOICES；
 *  前端幽灵键 pending_review/approved/signed 已删，键对齐后端 review） */
export const CONTRACT_STATUS: StatusMap<'draft' | 'review' | 'active' | 'expired' | 'terminated'> = {
  draft: { label: '草稿', tone: 'default' },
  review: { label: '审核中', tone: 'warning' },
  active: { label: '生效中', tone: 'success' },
  expired: { label: '已过期', tone: 'danger' },
  terminated: { label: '已终止', tone: 'danger' },
};

/** 交付项目状态（后端 cdd_platform/delivery/models.py DeliveryProject.STATUS_CHOICES） */
export const DELIVERY_PROJECT_STATUS: StatusMap<'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'> = {
  pending: { label: '待启动', tone: 'default' },
  in_progress: { label: '进行中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'danger' },
  on_hold: { label: '暂停', tone: 'warning' },
};

/** 交付项目阶段状态（后端 cdd_platform/delivery/models.py DeliveryStage.STATUS_CHOICES） */
export const DELIVERY_STAGE_STATUS: StatusMap<'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked'> = {
  pending: { label: '待开始', tone: 'default' },
  in_progress: { label: '进行中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  skipped: { label: '已跳过', tone: 'warning' },
  blocked: { label: '阻塞', tone: 'danger' },
};

/** 平台开票记录状态（后端 cdd_platform/invoice/models.py InvoiceRecord.STATUS_CHOICES；
 *  注意与门店级 Invoice 5 态互异，勿混用） */
export const INVOICE_RECORD_STATUS: StatusMap<'issued' | 'cancelled'> = {
  issued: { label: '已开具', tone: 'success' },
  cancelled: { label: '已作废', tone: 'danger' },
};

/** 订阅收款记录状态（后端 cdd_platform/finance/models.py PaymentRecord.STATUS_CHOICES；
 *  注意与收支记录 Transaction 6 态（FINANCE_RECORD_STATUS）互异，勿混用） */
export const PAYMENT_RECORD_STATUS: StatusMap<'confirmed' | 'cancelled'> = {
  confirmed: { label: '已确认', tone: 'success' },
  cancelled: { label: '已取消', tone: 'danger' },
};

/** 租户订阅状态（后端 cdd_platform/subscription/models.py TenantSubscription.STATUS_CHOICES） */
export const TENANT_SUBSCRIPTION_STATUS: StatusMap<'active' | 'expired' | 'cancelled' | 'pending'> = {
  active: { label: '生效中', tone: 'success' },
  expired: { label: '已过期', tone: 'danger' },
  cancelled: { label: '已取消', tone: 'default' },
  pending: { label: '待生效', tone: 'warning' },
};

/** 订阅订单状态（后端 cdd_platform/subscription/models.py SubscriptionOrder.STATUS_CHOICES） */
export const SUBSCRIPTION_ORDER_STATUS: StatusMap<'pending' | 'paid' | 'cancelled' | 'failed'> = {
  pending: { label: '待支付', tone: 'warning' },
  paid: { label: '已支付', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
  failed: { label: '支付失败', tone: 'danger' },
};

/** 平台工单状态（后端 cdd_platform/support/models.py Ticket.STATUS_CHOICES） */
export const TICKET_STATUS: StatusMap<'open' | 'in_progress' | 'resolved' | 'closed'> = {
  open: { label: '待处理', tone: 'danger' },
  in_progress: { label: '处理中', tone: 'warning' },
  resolved: { label: '已解决', tone: 'success' },
  closed: { label: '已关闭', tone: 'default' },
};

/** 平台工单优先级（后端 cdd_platform/support/models.py Ticket.PRIORITY_CHOICES） */
export const TICKET_PRIORITY: StatusMap<'low' | 'medium' | 'high' | 'urgent'> = {
  low: { label: '低', tone: 'default' },
  medium: { label: '中', tone: 'info' },
  high: { label: '高', tone: 'warning' },
  urgent: { label: '紧急', tone: 'danger' },
};

// ── store-web 门店域枚举（2026-10-11 P0-3 批5：键与标签全部镜像 store_services 真值）──

/** 订单生命周期（后端 store_services/core/orders/models.py OrderStatus，11 态） */
export const ORDER_LIFECYCLE_STATUS: StatusMap<
  | 'reception' | 'pending_inspection' | 'inspecting' | 'pending' | 'confirmed' | 'in_progress'
  | 'pending_settlement' | 'settled' | 'pending_payment' | 'delivered' | 'cancelled'
> = {
  reception: { label: '接待中', tone: 'info' },
  pending_inspection: { label: '待检查', tone: 'warning' },
  inspecting: { label: '检查中', tone: 'info' },
  pending: { label: '待确认', tone: 'warning' },
  confirmed: { label: '已确认', tone: 'info' },
  in_progress: { label: '施工中', tone: 'info' },
  pending_settlement: { label: '待结算', tone: 'warning' },
  settled: { label: '已结算', tone: 'success' },
  pending_payment: { label: '待收款', tone: 'warning' },
  delivered: { label: '已交车', tone: 'success' },
  cancelled: { label: '已取消', tone: 'default' },
};

/** 救援单状态（后端 store_services/core/orders/models.py RescueOrder.RESCUE_STATUS_CHOICES，
 *  字段名 rescue_status；2026-10-11 批5 标签漂移归一：出发中→前往中） */
export const RESCUE_ORDER_STATUS: StatusMap<
  'pending' | 'dispatched' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'settling' | 'closed' | 'cancelled'
> = {
  pending: { label: '待调度', tone: 'warning' },
  dispatched: { label: '已调度', tone: 'info' },
  en_route: { label: '前往中', tone: 'info' },
  arrived: { label: '已到达', tone: 'info' },
  in_progress: { label: '救援中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  settling: { label: '结算中', tone: 'warning' },
  closed: { label: '已关闭', tone: 'default' },
  cancelled: { label: '已取消', tone: 'danger' },
};

/** 车辆状态（后端 store_services/core/customers/models.py Vehicle.STATUS_CHOICES） */
export const VEHICLE_STATUS: StatusMap<'active' | 'near_maintenance' | 'maintenance_overdue' | 'scrapped'> = {
  active: { label: '正常', tone: 'success' },
  near_maintenance: { label: '临近保养', tone: 'warning' },
  maintenance_overdue: { label: '保养过期', tone: 'danger' },
  scrapped: { label: '车辆报废', tone: 'default' },
};

/** 事故询价单状态（后端 store_services/core/accident/models.py Inquiry.STATUS_CHOICES，6 态） */
export const ACCIDENT_INQUIRY_STATUS: StatusMap<'draft' | 'sent' | 'quoting' | 'completed' | 'closed' | 'cancelled'> = {
  draft: { label: '草稿', tone: 'default' },
  sent: { label: '已发送', tone: 'info' },
  quoting: { label: '报价中', tone: 'warning' },
  completed: { label: '已完成', tone: 'success' },
  closed: { label: '已关闭', tone: 'default' },
  cancelled: { label: '已取消', tone: 'danger' },
};

/** 客户储值账户状态（后端 store_services/core/finance/models.py AccountStatus，
 *  端点 /finance/accounts/；前端 StoredValueCardList 消费） */
export const CUSTOMER_ACCOUNT_STATUS: StatusMap<'active' | 'frozen' | 'suspended' | 'closed'> = {
  active: { label: '正常', tone: 'success' },
  frozen: { label: '冻结', tone: 'warning' },
  suspended: { label: '暂停', tone: 'info' },
  closed: { label: '关闭', tone: 'danger' },
};
