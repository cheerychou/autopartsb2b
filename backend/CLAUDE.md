# 后端开发规则（B1-RU）

全局约定见根级 `CLAUDE.md`。本文档为后端专属规则。

## 服务结构

| 模块 | 说明 | 目录 |
|------|------|------|
| catalog | 目录域（CDD3 受控派生：车型/配件/适配/交叉号/类目 + 数据包导入 + 只读查询） | `catalog/` |
| commerce | 交易域（商品/订单/收单/库存/客户/赋码/限时价/对账） | `commerce/` |
| shared | 共享（RBAC/中间件/校验） | `shared/` |
| config | Django settings（单租户运行） | `config/` |

> 模块边界：catalog 只读、零交易字段；commerce 不复制目录数据、只持 `catalog_spu_id` 软引用；两域仅通过 I1/I2（查询）与 F-15 审核状态（commerce 内部）衔接。详见 29号契约。

## 快速导航

| 我想做什么 | 去哪里找 |
|-----------|---------|
| 目录查询接口（I1/I2） | `catalog/services/` + `docs/research/29-*.md`（契约） |
| 数据包导入（I3） | `catalog/management/` + 27号§七协议 |
| 补录暂存/回流（I4） | `catalog/models_staging` + 27号§十 |
| 商品/订单/库存 | `commerce/` |
| 赋码（N2 码实例） | `commerce/codes/` + 25号§2.6 规格 |
| RBAC | `shared/permissions.py` |
| URL 注册 | `config/urls.py` |
| 测试 | `tests/`（factories.py 工厂） |

## API 规范

- 端点前缀：`/catalog/v1/*`（只读）、`/api/v1/*`（认证/交易）；契约语言见 29号§二（通用约定/响应包络/错误码）
- 用 `select_related` / `prefetch_related` 防 N+1（catalog 适配查询尤其注意 fitment→spu→brand 链）
- 禁止硬编码字符串（品类包代码/ТН ВЭД 码走可配置字典，25号§2.2 工程含义）
- 线格式统一 snake_case；schema 导出 `schema.yml` → 前端类型生成（禁手写 TS 类型）
- 错误响应：`error.code`（HTTP 数值）+ `error.error_code`（稳定业务码——两端 SPA 均按语言包渲染 ru/zh，`message`/`message_ru` 仅为服务端兜底文案，禁作 UI 唯一文案）；管理端与买家侧同规范（26号§六，2026-10-25 两端双语澄清）

## RBAC（裁剪版，承 CDD3 v2.0 机制）

- **唯一权限类**：`RoleBasedPermission` + ViewSet `ACTION_PERMISSIONS`（read/write/manage 三档）；禁止新建 DRF 权限类、禁止 `IsAuthenticated` 裸用
- **管理端 4 角色**（`shared/management/commands/init_rbac.py` 单一真相源）：`owner` / `staff` / `finance` / `data_steward`（数据员：I1 include_unverified 权限）
- **商城端 3 形态**（不进 RBAC，独立买家认证 JWT 双形态）：`guest`（匿名只读）/ `buyer_individual` / `buyer_corporate`（F-15 审核态字段控制可购性）
- 权限码风格：`module:action`（如 `catalog:read`、`orders:write`）

## 数据包与目录数据纪律

- hub 数据（包下发）：只读，禁止 UPDATE/DELETE；纠错→补录暂存→回流（I4）
- 导入协议：幂等（同包重导 no-op）、事务整体回滚、预检零容差（27号§七）——`catalog/management` 导入命令不得绕过校验链
- verified 门控：前台默认 `verified_only`（源码语义）；`include_unverified` 仅 data_steward 角色
- 目录 schema 版本与代码版本双轨：包 schema_ver 校验窗口见 27号§六

## 赋码（N2）纪律

- 码实例状态机：订/贴/入转/在库/出转/退回——状态迁移只经服务层方法，禁止裸改状态字段
- 品类范围=可配置字典（is_marked_category 按 ТН ВЭД 匹配，扩围只改字典）
- 外联仅限 ЧЗ API（P1 直连四点）+ 客户 УКЭП 凭证；v1 导入式先行（Excel 码清单）

## 命令

```bash
source venv/bin/activate
make dev          # runserver
make migrate      # 迁移（迁移只向前兼容，24号纪律）
make test         # pytest
make pre-check    # 全量预检（提交前必跑）
```

## 迁移管理规范

1. 改模型后 `make makemigrations`；检查生成的迁移 SQL 合理
2. **迁移只向前兼容**（私有化 N 实例升级纪律，24号§六.1）——禁止写会破坏老数据的迁移
3. 禁止手动编辑已执行过的迁移；禁止合并后重新生成迁移
