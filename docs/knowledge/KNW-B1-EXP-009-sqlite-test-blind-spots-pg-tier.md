---
doc_id: KNW-B1-EXP-009
title: SQLite 测试档两大盲区——varchar 长度零校验 / 行锁零验证，PG 真库测试档机制
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-009 SQLite 测试档的两大盲区与 PG 真库测试档

**终态**（2026-10-26，31号任务 5 实证，PG 15.14 @ localhost:5433）：
`B1RU_TEST_SQLITE=1` 封闭档全绿 ≠ 真库无恙。PG 档首轮即暴露两类 SQLite 假绿：

1. **varchar(max_length) SQLite 完全不校验**，PG 强制（`StringDataRightTruncation`）。
   实锤：`test_walkthrough_fixes` 工厂拼 `spu_code="SPUWA"+n+"adm"`（9 字符）写入
   `varchar(7)`（`catalog/models_product.py` spu_code，CDD3 拷贝域 max_length 不可改）。
   修法在测试侧缩短拼码（工厂前缀 `SPW`+单字符 suffix，n 两位也不超）。
2. **行级锁零验证**：SQLite 无行级锁、写全库串行，`select_for_update` 并发语义
   在 SQLite 档是纯纸面。新增 `tests/test_pg_concurrency.py` 双线程竞态真验证：
   Barrier 同步起跑双核销/双发货同一订单，PG 下**恰好一成一败**（败者
   OrderStateError），行锁首次实证 ✅。模式要点：跨线程只传 pk（ORM 实例绑定
   创建线程连接）；worker finally 必 `connection.close()`（否则 TransactionTestCase
   teardown 销毁测试库被残留连接卡死）。

**运行机制**：`make test-backend-pg`（不带 B1RU_TEST_SQLITE 的全量；本机 dev
compose `db` 服务或 brew PG 实例于 settings 默认 5433）。并发测试文件带
`skipif(connection.vendor != "postgresql")`——SQLite 档自动跳过（败者可能报
`database is locked` 而非 OrderStateError，会 flaky），两档对称全绿：
PG 108 passed / SQLite 106 passed + 2 skipped。

**何时读**：写含 varchar 边界/行锁/并发/事务回滚的代码或测试；DoD 2 正式验收前；
遇到「SQLite 档全绿但真库报 DataError / TransactionManagementError」时。

**处置纪律**：
1. 涉及**行锁、varchar 边界、事务回滚**的改动必须双档验证
   （`make pre-check` + `make test-backend-pg`）；纯业务逻辑改动 SQLite 档足够；
2. 测试造数拼编码字段前先查模型 `max_length`（grep 拷贝域 models），短前缀+
   单字符 suffix 最稳；
3. 并发断言写「恰一成一败」而非指定谁赢——Barrier 起跑顺序不保证；
4. 审计代码用 sed/读片段时**上下文必须带装饰器行**（def 前一行）——本次曾因
   `sed -n '49,100p'` 切掉 `@transaction.atomic` 误判 confirm_payment 缺事务包裹
   （48 行有），靠 worker 探针复测才纠回。假警报的代价是真核销链路排查一轮。

关联：[KNW-B1-EXP-005](KNW-B1-EXP-005-data-assertion-baseline.md)（先实证后断言）、
[KNW-B1-EXP-008](KNW-B1-EXP-008-drf-override-settings-snapshot-poison.md)
（测试配置纪律的姊妹篇——008 讲"别改 import 期快照"，009 讲"换真库补盲区"）。
