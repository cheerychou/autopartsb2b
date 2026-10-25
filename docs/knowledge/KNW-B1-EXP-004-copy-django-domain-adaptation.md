---
doc_id: KNW-B1-EXP-004
title: 受控拷贝接入适配三件套——Django 拆分模型文件不自动发现
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-25
---

# KNW-B1-EXP-004 拷贝 Django 模型域的接入适配三件套

**终态**：CDD3 目录域拷入本仓后连续三坑：①`ModuleNotFoundError: data_platform.brand_letter`——拷贝文件内的 import 路径要改；②`No installed app with label 'catalog'`——apps.py 需 `label = "data_platform"`（FK 字符串引用 "data_platform.SPU" 才能解析）；③模型全部就位但查询报关系缺失——**Django 只自动发现 `models.py`，`models_*` 拆分文件必须 apps.ready() 显式 import**（CDD3 用同机制，见其 DataPlatformConfig.ready）。

**何时读**：从 CDD3（或任何 Django 项目）拷贝模型域到新 app 时；makemigrations "No changes detected" 而模型明明存在时。

**教训全文**：
1. 接入适配三件套缺一不可：**label 重定向**（FK 字符串解析）+ **import 路径改写**（`from data_platform.` → `from catalog.`）+ **ready() 注册全部拆分文件**；三者都属"接入适配"而非"修改拷贝文件"，登记 copy-ledger 即不违反"只加不改"；
2. **db_table 前缀保留上游原名**（`data_platform_*`）：显式指定不受 label 影响，保留才能与上游可合并；
3. **按名望义必翻车**（23号§七同款教训）：`models_oem` 是授权台账不是 OE 交叉号（真身 SPUInterchange 在 models_product）；`models_mapping` 是采集映射不是命名映射——拷贝前逐文件读源码，字段级勘定（27号§五勘定稿的做法）；
4. 拷贝后先跑 `manage.py check` → `makemigrations` → `migrate` → 用真实数据导入验证计数与源库一致（S1 实证：SPU 823,901 与 CDD3 cdd_dev 逐行一致是最强正确性证据）。
