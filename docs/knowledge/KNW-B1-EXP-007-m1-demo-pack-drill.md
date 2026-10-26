---
doc_id: KNW-B1-EXP-007
title: M1 演示数据包与对公全链路演练记录（I3 补实体 + UUID 预绑定 + 六步留证）
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-007 M1 演示包与对公全链路演练记录

**终态**：26号 §九 DoD2/DoD3 的仓内演练完成（2026-10-26）。演示包 `make_demo_pack`
（INIT 46 行 + DELTA 4 行，确定性 uuid5，幂等可复算）→ `import_seed_package`
（新增 vehicle_series/vehicle_models/fitments/spu_interchanges 四实体导入 +
包内 UUID 预绑定）→ `seed_demo_commerce`（2 可售 SKU）→ storefront 真实服务端
六步对公演练两轮通过。

**何时读**：复跑 M1 演示；扩展 I3 导入实体；排查"按码导入后 entity_names 挂不上"类问题。

## 演练证据（真实服务端 127.0.0.1:8001，SQLite dev 库）

| 步骤 | 动作 | 证据 |
|---|---|---|
| ① | 游客按车找件（匿名无外联） | CHERY→TIGGO7→TIG7-15T→fitments 返回 DM00001（Колодки тормозные…verified FRONT）+DM00002（диск verified） |
| ② | 游客价格门控 | `offer.price=null`，quantity_available 可见（22） |
| ③ | 企业注册 | buyer_type=corporate → verification=pending |
| ④ | 浏览/下单分离 | 登录企业可见价 2850.00、加购 201；下单 403 `CORPORATE_PENDING` |
| ⑤ | F-15 审核 | 管理端 approve → approved/can_order=true |
| ⑥ | F-06 对公下单 | ORD202610260002 awaiting_confirmation 5700.00（价格快照 2850×2） |
| ⑦ | F-14 核销 | confirm-payment（金额一致校验）→ paid |
| ⑧ | F-13 发货 | ship（CDEK-100500）→ shipped |
| ⑨ | F-07 签收 | 买家确认收货 → completed；库存流水 24→20（append-only 可追溯） |

脚本：`deploy/demo/m1-alpha-drill.sh`（买家账号带时间戳可重复跑；全程无外网依赖）。
包更新演练（DoD3）：INIT 重导 →"已导入过，跳过（幂等）"；DELTA → DM00005+适配+ru 名称增量生效
（目录版本 DEMO-0001→DEMO-0002）；schema_ver=2.0 篡改包 → 拒收零残留
（自动化：`tests/test_demo_pack.py` 4 例；重导 no-op/增量/拒收均有真实服务端留证）。

## 教训（本次踩过的三个坑）

1. **拷贝域 FK 命名双轨**——CDD3 侧 `VehicleSeries.brand_id` 是 FK **字段名**
   （attname=brand_id_id），而 `VehicleModel.series` 是常规命名（attname=series_id）。
   给拷贝域写"按 UUID 建行"代码时，attname 直接塞 FK **实例**不会报错但入库成字符串
   （`"TIGGO7 - 瑞虎7" 不是一个有效的UUID`），必须经 `get_field` 判定后走**描述符**
   （字段名塞实例 / attname 塞字符串），不能用同一键名塞同一形态。
2. **实体行 UUID 与语料挂接是两段事务内的一体两面**——27号§5.2"主键随包下发"不是
   装饰：entity_names 的 entity_id 指向实体 UUID，若按码 upsert 随机发 PK，语料
   全部悬空。解决：导入事务内先"UUID 骨架行预绑定"，既有按码 upsert 随后补全
   （copy-ledger R-A1++ 接入适配）。**绕过命令直调 importer 函数会在库内留下
   未绑定 PK 的脏数据，且 DELTA 包一来就炸**（Brand matching query does not exist）。
3. **DELTA 包预检不能按 INIT 语义要求全实体文件**——27号§四 DELTA 只带变更实体；
   missing_files 预检须限定"counts>0 的实体必须有文件"，否则合法 DELTA 被误判
   包损坏。演练先于真实包踩到，修正后在 `tests/test_demo_pack.py::test_delta` 固化。

## 复跑手册（backend/ 目录）

```bash
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py make_demo_pack          # 出 INIT/DELTA 到 deploy/demo/
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package --package ../deploy/demo/B1RU-CAT-DEMO-INIT-0001.zip
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package --package ../deploy/demo/B1RU-CAT-DEMO-DELTA-0002.zip
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py seed_demo_commerce       # 2 SKU：组商品→上架→入库
# 管理员（一次性）：shell 建 b1owner + init_rbac --assign b1owner:owner
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py runserver 127.0.0.1:8001 --noreload
BASE=http://127.0.0.1:8001 bash ../deploy/demo/m1-alpha-drill.sh
```

关联：[KNW-B1-EXP-004](KNW-B1-EXP-004-copy-django-domain-adaptation.md)（拷贝域接入适配三件套）、
[KNW-B1-EXP-003](KNW-B1-EXP-003-verification-claim-inflation.md)（验收留证格式）、
copy-ledger R-A1++（本次接入适配登记）、26号 §九 DoD2/DoD3。
