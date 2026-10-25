---
doc_id: B1RU-GOV-001
title: B1-RU 工程文档治理规范（编号/frontmatter/生命周期）
category: B1RU
domain: governance
status: active
updated_at: 2026-10-25
---

# B1-RU 工程文档治理规范

> 机制承 CDD3 FND-GOV-001/002/004（copy-ledger 登记于 docs/engineering/copy-ledger.md）；研究过程层（docs/research/01–31 号）不在本规范管辖内，保持现状。

## 一、编号体系

制品层文档（`docs/engineering/`、`docs/knowledge/`、部署与架构文档）使用：

```
B1RU-[域]-[序号]-[name].md        制品层（当前事实，挂导航）
KNW-B1-[域]-[序号]-[name].md      经验教训册（docs/knowledge/）
```

域代码（初始集）：`GOV` 治理 ｜ `ARCH` 架构 ｜ `API` 接口 ｜ `ENG` 工程实施 ｜ `OPS` 部署运维 ｜ `EXP` 通用经验（KNW 专用）。

编号全局唯一、只增不删；废弃文档 status 改 `archived` 移入 `docs/_archive/`（不物理删除）。

## 二、Frontmatter 规范（pre-commit 强制）

`docs/engineering/` 与 `docs/knowledge/` 下所有 Markdown 必须含：

```yaml
---
doc_id: B1RU-ENG-001        # 与文件名一致
title: 一行标题
status: active              # active / draft / archived
updated_at: 2026-10-25      # 内容变更时同步（doc-updated-check 提示）
---
```

## 三、生命周期与分流三问（承 FND-GOV-004）

新建文档前自问：

1. **当前事实还是过程思考？** 事实 → 制品层（本规范编号）；思考/调研 → `docs/research/` 续号或 `_archive/`；
2. **已有权威文档可挂靠？** 有 → 补小节/链接，不新建；
3. **结论可蒸馏进 KNW？** 可 → 结论入 `docs/knowledge/`，原文归档。

## 四、完成声明规范

文档标记"已完成"必须附证据：`✅ 已完成 | commit: <短hash> · 日期`；commit message 引用编号（如 `feat(commerce): 限时价引擎 (26号F-11)`），支持 `git log --grep` 反查。禁止无 commit 证据的完成声明。

## 五、AI 记忆写入纪律（承 CDD3）

- 索引行 ≤200 字符（主题+终态+何时需要读）；
- 项目级教训进 KNW-B1；git 历史/已沉淀内容不入记忆库。
