"""
公共选项常量 - 数据平台各模型共享的状态选项

将各模型文件中重复定义的 STATUS_CHOICES 统一管理。
各模型特有的状态选项（如 TASK_STATUS_CHOICES）仍保留在对应模型文件中。
"""

# 通用状态：草稿/待审核/启用/停用/归档
STATUS_CHOICES = [
    ("draft", "草稿"),
    ("pending", "待审核"),
    ("active", "启用"),
    ("inactive", "停用"),
    ("archived", "归档"),
]

# SKU 来源权威性档位（FND-DS-CH-003 公理②）
# T0=OEM 原厂件（manufacturer=OEM 品牌，mpn=OE 号）
# T1=给 OEM 直接供货的零部件厂商（manufacturer 在 Tier 1 供应商清单内）
# T2=未给 OEM 供货的逆向研发小厂（默认）
# 判定方式：品牌为主（按 SKU.manufacturer）+ 来源微调（按 SKU.data_source）
SOURCE_TIER_CHOICES = [
    ("T0", "OEM原厂件"),
    ("T1", "Tier1供应商"),
    ("T2", "Tier2小厂"),
]

# SPU↔SKU 关联的验证状态（FND-DS-CH-003 公理④）
# unverified=待验证（默认，采集入库未经权威确认）
# verified=已验证（权威来源自动认定 或 人工审核确认，双轨不可偏废）
# disputed=有争议（业务侧退换货反馈触发，需人工复核）
# 与 SKU.source_tier 正交：source_tier 是商品本身的权威，verified_status 是关联的可信度
VERIFIED_STATUS_CHOICES = [
    ("unverified", "待验证"),
    ("verified", "已验证"),
    ("disputed", "有争议"),
]
