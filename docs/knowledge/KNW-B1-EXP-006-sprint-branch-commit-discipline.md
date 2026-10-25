---
doc_id: KNW-B1-EXP-006
title: 快节奏 Sprint 的分支与提交纪律——一次误落 main 与"声明超前认领"
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-25
---

# KNW-B1-EXP-006 快节奏下的分支与提交纪律

**终态**：一天五 Sprint 节奏下出两起纪律事故——①S1 开工时 HEAD 停在 main（S0 提交后 checkout main 验证状态，忘切回），新工作写进 main 工作树，checkout 切回时还被 untracked 文件挡了一次；②S3 的 commit message 冠以"31号 S3"，但 S3 出口判据"俄语前台全流程"实际只有 API 切片（前端还是 skeleton div）。

**何时读**：每个 Sprint 开工第一分钟；写 commit message 时。

**教训全文**：
1. **开工先 `git branch --show-current`**——一行命令防一次"工作写错分支"；发现误落时：untracked 文件在切分支时会保留，仅 apps.py 等同名冲突需备份-切换-恢复；
2. **commit message 只声明做了的事，不声明"应该做到的事"**——S3 出口判据是前台全流程，API 切片就写"S3-API 切片"（评审建议）；口径：Sprint 编号≠出口判据达成，达成与否对照 31号§四的判据列；
3. **验收声明格式**（EXP-003 的姊妹条）：Sprint 出口在 KNW/变更记录留对照痕迹，让"达成/未达成"可审计；
4. 排期漏项要当场认（I4 从 Sprint 表消失是漏项不是裁剪）——发现时立即补录进排期文档并标注来源（评审确认），拖着就是范围静默缩水。
