---
doc_id: KNW-B1-EXP-013
title: 检测器/自愈器设计语义——比对基准选错与 checkout 还原撤销修复，工作区状态纪律
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-013 检测器/自愈器的设计语义（schema drift 检测初版两缺陷实证）

**终态**（2026-10-26，`make check-schema-drift` 初版两处设计错误 + 一次工作区
状态管理失误，调试三轮收敛）：

1. **比对基准选错**：初版用 `git diff --quiet -- schema.yml`（vs HEAD）判漂移
   ——把「待提交的合法同步」误判成漂移（开发者跑了 make api-types 还没提交，
   pre-check 永远红）。**正确语义=重导前后自比**：重导改变了内容=文件落后于
   代码（真漂移）；没变=文件最新（与是否已提交无关）。
2. **"还原"撤销了修复本身**：落后场景初版用 `git checkout -- schema.yml`
   还原——但重导结果就是修复，checkout 把它撤销回旧版 → 每次跑都红，死循环。
   **修法（自愈式）**：落后时保留重导结果 + 报错提示提交（第一次红=修复+
   告警，第二次绿——两跑收敛是验收标准）。
3. **工作区状态纪律**：制造漂移用例测试后，还原动作把 schema.yml 退回 HEAD
   旧版，未察觉 → 后续 pre-check 连红两次才定位。**纪律**：任何
   `git checkout -- <file>` 后立即重审该文件工作区状态（git status + diff），
   还原"实验污染"与还原"合法未提交变更"是两个不同动作。

**何时读**：写 drift/一致性检测类 make 目标或 CI 检查；检测器出现"永远红/
绿但明明有问题"时；脚本里要用 git checkout 还原文件前。

**处置纪律**：
1. 检测器先写清语义：**比对基准是什么**（工作区自比 vs HEAD vs 上游）——
   基准错，检测器越努力越误报；
2. 自愈动作不与 git 还原混用：能"重算自愈"的（重导/重生成）保留结果提示提交；
   只有纯实验污染才 checkout 还原，且还原后重审状态；
3. 验收双向用例 + **两跑收敛**（首跑修复+告警、次跑干净）。

关联：[KNW-B1-EXP-005](KNW-B1-EXP-005-data-assertion-baseline.md)（断言带基准
——同族思想：检测器也要带基准声明）、[KNW-B1-EXP-003](KNW-B1-EXP-003-verification-claim-inflation.md)。
