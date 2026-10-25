---
name: pre-check-before-pr
description: 开 PR 或提交代码前必须运行本地预检（make pre-check），确保 build/test/lint 通过后再提交。当用户要求提交、推送、开 PR 时触发。
---

# 提交前预检（B1-RU）

## 场景入口（先判断改了什么，再选第一动作）

| 改动面 | 第一动作 |
|---|---|
| 后端 `models*/serializers*/views*/urls.py` | 预期 schema 漂移检查会红——**先走 3.5 三连**（schema 导出 → 两应用类型再生成）再跑预检 |
| 只改前端（storefront/admin） | `make pre-check`；改了 `@cdd/b1-shared-ui` 须连跑两应用消费端测试 |
| 改 catalog 拷贝域文件（copy-ledger 登记） | 额外确认"只加不改"未破 + REVIEW.md 高危域第 5 条（人工必审） |
| 改 CI/部署/Dockerfile | 全量验证；先读 CDD3 KNW-EXP-004/009/013 同类教训（未沉淀前按其文件名清单到 CDD3 仓查阅） |

## 强制流程

```bash
make pre-check        # = lint + type-check + 后端 pytest + 前端两应用 test:run + 禁止模式检查
```

### 3.5 schema 三连（改了后端接口/模型后必跑）

```bash
make schema                    # 1) 导出 backend/schema.yml
pnpm --filter storefront-web generate:api-types   # 2a) 商城类型再生成
pnpm --filter admin-web generate:api-types        # 2b) 管理端类型再生成
git diff --stat                # 3) 自检：api-types 两文件同现（只出现一边 = 漏跑一处）
```

## 自检指纹

- schema 改后：两应用 `api-types.ts` 同源同变更——`git diff --stat` 里只有一个 = 漏跑；
- catalog 改动：`copy-ledger.md` 是否需要更新（新拷贝/剥离项）；
- 数据包契约改动（27号相关）：同步检查 27号§十三对照表是否仍成立。

## 红线

- 预检红灯禁止提交（禁止 --no-verify）；
- CI 集体异常先查计费/环境指纹，勿 rerun 硬闯（CDD3 KNW-EXP-004 教训）；
- Dockerfile 改动：本地 `docker build` 先行（KNW-EXP-013 教训）。
