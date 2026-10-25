/**
 * 统一特性注册表（Feature Registry）
 *
 * 所有特性键（feature key）在此统一定义，前端各模块通过引用常量使用，
 * 避免特性字符串分散在导航配置、路由守卫、组件中导致维护困难。
 *
 * 两层模型：
 *   - 模块级（Module）：控制整个业务模块的可见性，如 customers、warehouse
 *   - 功能级（Capability）：控制模块内特定功能的可见性，如 inventory_stocktake
 *
 * 核心规则：功能级隐含模块级。即 inventory_stocktake=true 自动意味着 warehouse=true。
 *
 * 与后端 shared.feature_registry.Feature / FeatureGroup 保持同步。
 * 命名规范：使用下划线分隔。
 */

/** 特性键常量 */
export const Feature = {
  // ── 基础模块级门控 ──────────────────────────────────────────
  /** 客户管理 */
  CUSTOMERS: 'customers',
  /** 仓储管理 */
  WAREHOUSE: 'warehouse',
  /** 采购管理 */
  PROCUREMENT: 'procurement',
  /** 人力资源管理 */
  HR: 'hr',
  /** 营销中心 */
  MARKETING: 'marketing',
  /** 接待管理 */
  RECEPTION: 'reception',
  /** 车间管理 */
  WORKSHOP: 'workshop',
  /** 连锁管理 */
  CHAIN: 'chain',
  /** 财务管理 */
  FINANCE: 'finance',

  // ── 快修专属特性 ────────────────────────────────────────────
  /** 工时项目快捷选择面板 */
  QUICK_LABOR_SELECT: 'quick_labor_select',
  /** 接待工作台"洗车开单"按钮 */
  CAR_WASH_QUICK_BUTTON: 'car_wash_quick_button',
  /** 洗美转化率指标 */
  WASH_CONVERSION_RATE: 'wash_conversion_rate',
  /** 报表"转化分析"Tab */
  CONVERSION_ANALYTICS: 'conversion_analytics',

  // ── 高级库存特性（G5 / C7） ────────────────────────────────
  /** 库存批次追踪 */
  INVENTORY_BATCH_TRACKING: 'inventory_batch_tracking',
  /** 库存效期预警 */
  INVENTORY_EXPIRY_ALERT: 'inventory_expiry_alert',
  /** 盘点管理 */
  INVENTORY_STOCKTAKE: 'inventory_stocktake',
  /** 多仓库/库位 */
  INVENTORY_MULTI_WAREHOUSE: 'inventory_multi_warehouse',
  /** 库存成本管理 */
  INVENTORY_COST_MANAGEMENT: 'inventory_cost_management',

  // ── 综合维修厂特性（G5 / C7） ──────────────────────────────
  /** 事故管理 */
  ACCIDENT_MANAGEMENT: 'accident_management',
  /** 保险理赔 */
  INSURANCE_CLAIM: 'insurance_claim',
  /** 复杂工单 */
  COMPLEX_WORK_ORDER: 'complex_work_order',

  // ── 连锁特性（C7 专属） ────────────────────────────────────
  /** 连锁数据同步 */
  CHAIN_DATA_SYNC: 'chain_data_sync',
  /** 连锁报表 */
  CHAIN_REPORTING: 'chain_reporting',

  // ── 外部集成特性 ────────────────────────────────────────────
  /** 外部系统集成 */
  EXTERNAL_INTEGRATION: 'external_integration',

  // ── 成本与利润特性 ──────────────────────────────────────────
  /** 直采直用交易类型 */
  DIRECT_USE_TRANSACTION: 'direct_use_transaction',
  /** 订单毛利概览 */
  ORDER_PROFIT_VIEW: 'order_profit_view',

  // ── 数据分析中心 ────────────────────────────────────────────
  /** 数据分析中心 */
  ANALYTICS_DAS: 'analytics_das',
} as const;

/** 特性键类型（从常量自动推导） */
export type FeatureKey = (typeof Feature)[keyof typeof Feature];

/** 全部特性键列表，用于校验和遍历 */
export const ALL_FEATURES: readonly FeatureKey[] = Object.values(Feature);

// ── 特性分组定义 ─────────────────────────────────────────────────

/** 特性分组定义 */
export interface FeatureGroupDef {
  /** 模块级特性键 */
  module: FeatureKey;
  /** 分组中文标签 */
  label: string;
  /** 功能级特性键列表 */
  capabilities: readonly FeatureKey[];
}

/**
 * 特性分组注册表
 *
 * 管理所有特性分组定义，提供模块级→功能级的隐含推导能力。
 * 与后端 FeatureGroup 保持同步。
 *
 * 使用方式:
 *   // 检查特性是否启用（含模块级隐含推导）
 *   isFeatureEnabled(features, Feature.INVENTORY_STOCKTAKE)
 *   // → 如果 warehouse=false，即使 inventory_stocktake=true 也返回 false
 */
export const FeatureGroups: Record<string, FeatureGroupDef> = {
  // ── 客户管理 ──────────────────────────────────────────────────
  CUSTOMERS: {
    module: Feature.CUSTOMERS,
    label: '客户管理',
    capabilities: [],
  },

  // ── 仓储管理 ──────────────────────────────────────────────────
  WAREHOUSE: {
    module: Feature.WAREHOUSE,
    label: '仓储管理',
    capabilities: [
      Feature.INVENTORY_BATCH_TRACKING,
      Feature.INVENTORY_EXPIRY_ALERT,
      Feature.INVENTORY_STOCKTAKE,
      Feature.INVENTORY_MULTI_WAREHOUSE,
      Feature.INVENTORY_COST_MANAGEMENT,
    ],
  },

  // ── 采购管理 ──────────────────────────────────────────────────
  PROCUREMENT: {
    module: Feature.PROCUREMENT,
    label: '采购管理',
    capabilities: [],
  },

  // ── 人力资源管理 ──────────────────────────────────────────────
  HR: {
    module: Feature.HR,
    label: '人力资源管理',
    capabilities: [],
  },

  // ── 营销中心 ──────────────────────────────────────────────────
  MARKETING: {
    module: Feature.MARKETING,
    label: '营销中心',
    capabilities: [],
  },

  // ── 接待管理 ──────────────────────────────────────────────────
  RECEPTION: {
    module: Feature.RECEPTION,
    label: '接待管理',
    capabilities: [
      Feature.QUICK_LABOR_SELECT,
      Feature.CAR_WASH_QUICK_BUTTON,
      Feature.WASH_CONVERSION_RATE,
      Feature.CONVERSION_ANALYTICS,
    ],
  },

  // ── 车间管理 ──────────────────────────────────────────────────
  WORKSHOP: {
    module: Feature.WORKSHOP,
    label: '车间管理',
    capabilities: [
      Feature.ACCIDENT_MANAGEMENT,
      Feature.INSURANCE_CLAIM,
      Feature.COMPLEX_WORK_ORDER,
    ],
  },

  // ── 连锁管理 ──────────────────────────────────────────────────
  CHAIN: {
    module: Feature.CHAIN,
    label: '连锁管理',
    capabilities: [
      Feature.CHAIN_DATA_SYNC,
      Feature.CHAIN_REPORTING,
    ],
  },

  // ── 财务管理 ──────────────────────────────────────────────────
  FINANCE: {
    module: Feature.FINANCE,
    label: '财务管理',
    capabilities: [
      Feature.DIRECT_USE_TRANSACTION,
      Feature.ORDER_PROFIT_VIEW,
    ],
  },

  // ── 外部集成 ──────────────────────────────────────────────────
  EXTERNAL_INTEGRATION: {
    module: Feature.EXTERNAL_INTEGRATION,
    label: '外部集成',
    capabilities: [],
  },

  // ── 数据分析中心 ──────────────────────────────────────────────
  ANALYTICS_DAS: {
    module: Feature.ANALYTICS_DAS,
    label: '数据分析中心',
    capabilities: [],
  },
};

// ── 功能级→模块级反向索引（懒加载） ─────────────────────────────

let _capabilityToModule: Map<FeatureKey, FeatureKey> | null = null;

/** 构建功能级→模块级的反向索引 */
function getCapabilityIndex(): Map<FeatureKey, FeatureKey> {
  if (!_capabilityToModule) {
    const index = new Map<FeatureKey, FeatureKey>();
    for (const group of Object.values(FeatureGroups)) {
      for (const cap of group.capabilities) {
        index.set(cap, group.module);
      }
    }
    _capabilityToModule = index;
  }
  return _capabilityToModule;
}

/**
 * 查找功能级特性所属的模块级特性键
 *
 * @param featureKey 特性键
 * @returns 模块级特性键，如果该特性本身就是模块级则返回 undefined
 */
export function findFeatureModule(featureKey: FeatureKey): FeatureKey | undefined {
  return getCapabilityIndex().get(featureKey);
}

/**
 * 检查特性是否启用（含模块级隐含推导）
 *
 * 检查逻辑：
 * 1. 特性键本身必须为 true
 * 2. 如果该特性属于某个分组，则所属模块级也必须为 true
 *
 * @param features 已合并的特性字典
 * @param featureKey 要检查的特性键
 * @returns 特性是否启用
 */
export function isFeatureEnabled(
  features: Record<string, boolean>,
  featureKey: string,
): boolean {
  // 特性键本身必须为 true
  if (!features[featureKey]) return false;

  // 查找所属模块级，如果模块级关闭则功能级也关闭
  const parentModule = getCapabilityIndex().get(featureKey as FeatureKey);
  if (parentModule && !features[parentModule]) return false;

  return true;
}
