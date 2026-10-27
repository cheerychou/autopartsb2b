---
doc_id: B1RU-ENG-005
title: 内测执行手册（内部 alpha）——环境方案/启动清单/角色试做/反馈机制
category: B1RU
domain: ENG
status: active
updated_at: 2026-10-27
---

# B1RU-ENG-005 内测执行手册

> 目的：组织内部 alpha——**DoD 2 真实试单 ≥1 笔**（26号§九，M1 唯一事件型挂账）+
> ENG-003 内测观察清单 3 项取证 + 双语/体验反馈。物料全部就绪：演示包
> INIT-0001/DELTA-0002（4 SPU/5 适配/17 俄语名）+ 2 可售 SKU（DM00001 前刹车片、
> DM00003 机油滤）+ 安装手册（deploy/README，执行级走查已过）+ 开号流程（§3）。

## 一、环境方案（委托方拍板，二选一）

| 档 | 形态 | 适合 | 前置 |
|---|---|---|---|
| A 本机最小 | 开发机起栈（runserver+vite dev），内测者同机或同局域网访问 | 委托方本人先试（1~2 人）、走通主链 | 零采购；浏览器访问 localhost:5174/5175 |
| B 云主机多人 | 任一 Linux 云主机按 deploy/README 离线流程装（演练已验证的正式形态） | 3~5 人多角色并行、异地 | 一台 2C4G 主机+委托方提供访问方式 |

> 两档共用同一套启动 checklist（§二）；B 档顺带完成「首客部署」全流程彩排。

## 二、启动 checklist（命令均实测过）

```bash
# ---- A 档（本机）----
# 1) 后端 :8001（SQLite+演示数据，e2e/README 同款起栈清单）
cd backend && B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py migrate
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package --package ../deploy/demo/B1RU-CAT-DEMO-INIT-0001.zip
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package --package ../deploy/demo/B1RU-CAT-DEMO-DELTA-0002.zip
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py seed_demo_commerce
B1RU_TEST_SQLITE=1 DJANGO_SUPERUSER_USERNAME=b1owner DJANGO_SUPERUSER_EMAIL=ops@b1ru.local \
  DJANGO_SUPERUSER_PASSWORD='Demo-Owner-2026!' ./venv/bin/python manage.py createsuperuser --noinput
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py init_rbac --assign b1owner:owner
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py runserver 127.0.0.1:8001
# 2) 两端
pnpm --filter storefront-web dev   # :5174（买家）
pnpm --filter admin-web dev        # :5175（管理端）
```

- **B 档**：按 deploy/README §1→§3（离线镜像包已可打；数据导入/license 可选）；
- **分发账号**（每角色各一，deploy/README §3「账号管理」）：超管登录 `/admin/` 建普通用户
  → `init_rbac --assign 用户名:角色`。建议至少：owner×1、staff×1、finance×1、
  data_steward×1 + 买家自注册（企业形态需管理端审核，正好是试做内容）；
- license 可不装（信息性四态，缺失仅提示——正好观察「无 license」表现）。

## 三、角色试做清单（每人 15~30 分钟；F 编号对照 ENG-003 矩阵）

### 买家（重点：企业形态 + DoD 2 主链前半）

| # | 动作 | 预期 |
|---|---|---|
| 1 | 游客打开商城 → 按车找件（品牌→车系→车型→适配件）/ OE 检索 | 可浏览，**价格不可见** |
| 2 | 企业注册（ИНН 必填）→ 登录 | 见价可加购；**下单被拒（待审核提示）** |
| 3 | （等 owner 审核后）重新登录 → 加购 → 对公下单 | 订单生成，状态「待确认到账」 |
| 4 | 订单详情/跟踪 →（发货后）确认收货 | 状态流转可见；完成态 |
| 5 | 右上角 ru/zh 切换 | 全部界面文案切换（观察遗漏处） |

### owner（店主视角全览）

1. 管理端登录 → 六大菜单全走一遍（商品/库存/订单/收单流水/客户/赋码/报表）；
2. **审核企业买家**（回写账号状态）→ 核销到账（金额预填）→ 发货（物流单号）；
3. 报表页 4 张看一遍（sales/滞销/覆盖率/码账龄）；
4. 观察点：**哪一步你想做但找不到入口？**（防遗漏第一手证据）

### staff（店长/仓管）

1. 组 SKU 挂价（选件器回填）/ 上下架；库存出入库记账+流水；
2. 赋码工作台（批次导入→打印清单→报关清单导出）——若演示受控品类；
3. 观察点：报表页不可见是否影响你的日常工作？（观察清单⑦b 取证）

### finance（财务）

1. **收单流水页**（/payments）：核销后流水行/日期过滤/区间合计；
2. 订单页只读视角；报表页；
3. 观察点：流水粒度够不够对账？（缺口①的首轮真实反馈）

### data_steward（数据员）

1. Django admin（/admin/）→ 暂存适配补录 → export-feed 导出回流包；
2. hub 只读数据在 I1 的展示（含俄语名回退链）；
3. 观察点：Django admin 兜底是否够用到 M2 中？（F-24 问1 拍板取证）

## 四、观察清单（ENG-003 已挂账，内测取证）

| 观察项 | 取证问题 | 转正条件 |
|---|---|---|
| 黑名单老客（缺口②） | 内测中是否出现「想拉黑某人」的真实冲动？ | 有 → 立项最小黑名单 |
| staff 报表（缺口⑦b） | 店主是否愿让店长看销售报表？ | 愿 → 加 reports:read 一行事 |
| 缺货展示（缺口⑦a） | 买家看到缺货件是干扰还是线索？ | 痛点 → 评估实例级开关 |

## 五、反馈记录机制（一表三分流）

内测反馈统一记入 `docs/research/_archive/beta-feedback-<日期>.md`（过程层，不编号新文档），
每条标注分流去向：

| 分流 | 判据 | 去向 |
|---|---|---|
| 缺陷 | 做不了/报错/显示错 | 工程修复批次（高危域走评审） |
| 缺口 | 该有但没有的功能 | ENG-003 缺口清单（按流程定级） |
| 观察 | 拍板挂账项的取证 | ENG-003 观察清单 → 转正或关闭 |

## 六、退出判据

1. **DoD 2 闭环**：真实试单 ≥1 笔全链（找件→限时价→对公→履约→对账）——ENG-004 挂账清零；
2. 观察清单 3 项各有结论（转正/关闭）；
3. 反馈分流完毕：缺陷修复批次排期、缺口进 ENG-003；
4. M1 正式收口宣告（ENG-004 §五更新）。

## 关联

[ENG-004](B1RU-ENG-004-m1-closeout-review.md)（M1 收口对照，DoD 2 挂账源）｜[ENG-003](B1RU-ENG-003-admin-func-role-matrix.md)（矩阵+观察清单）｜deploy/README（安装/账号/license）｜frontend/e2e/README（起栈清单同源）
