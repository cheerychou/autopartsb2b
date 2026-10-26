---
doc_id: KNW-B1-EXP-008
title: 测试内 override_settings(REST_FRAMEWORK) 毒化 DRF import 期类快照——整进程认证/限流静默报废
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-008 测试内 override_settings(REST_FRAMEWORK) 的类快照污染

**终态**（2026-10-26，P3 批次 `8d626af` 引入限流时踩中）：任一测试用
`override_settings(REST_FRAMEWORK={...})`（或 conftest 每 test 改写），只要 DRF
视图链在覆写窗口内**首次被 import**（URLconf lazy 解析），三处 import 期类快照
被永久绑到覆写字典上：

- `APIView.authentication_classes` ← 覆写字典缺 `DEFAULT_AUTHENTICATION_CLASSES`
  → 落到 DRF 默认（Basic/Session）→ **全进程后续所有 Bearer 认证 403**
  「身份认证信息未提供」（凭证明明在 header 里）；
- `SimpleRateThrottle.THROTTLE_RATES`（含自建子类）→ 速率冻结为覆写值
  → 后续测试连环 429；
- 自建 Throttle 子类的类体快照同理。

`api_settings.reload()` 只换 api_settings 自身包裹对象，**不回写已 import 的类属性**。
症状与原因相距极远（单跑通过、全量跑挂；失败点在被污染测试的**后面几个**），
定位耗时远超修复。

**何时读**：给 DRF 写限流/认证相关测试；测试里想临时改 REST_FRAMEWORK；出现
「单测过、全量挂、失败点漂移」且报错是认证/限流类时。

**处置纪律**：
1. **测试内禁 `override_settings(REST_FRAMEWORK=...)`**（conftest 顶部已写明）；
2. 测试环境的差异化配置走**环境变量**（本仓：`B1RU_AUTH_THROTTLE_RATE`，
   Makefile test-backend 设 `10000/min`——进程级一致，import 期即正确）；
3. 需要逐测改限流速率时，`mock.patch.object(SomeThrottle, "THROTTLE_RATES", {...})`
   直改类快照（with 自动还原，零污染），参考 `tests/test_p3_hygiene.py`；
4. 排查此类问题时先做**最小二分复刻**（覆写→HTTP 请求→退出→再请求），
   别在 DRF 源码推断里打转——本次实证链：DIRECT_AUTH 通过而 APIClient 403，
   才锁定"认证类快照被换"而非 token/header 问题。

关联：[KNW-B1-EXP-001](KNW-B1-EXP-001-drf-api-view-attribute-trap.md)（api_view 属性
拷贝白名单——同族"DRF 静默丢弃/快照"陷阱）、[KNW-B1-EXP-005](KNW-B1-EXP-005-data-assertion-baseline.md)
（先实证后断言）。
