---
doc_id: KNW-B1-EXP-014
title: 提交前自检顺序——pre-commit hook 未装致格式化两轮红、t() fallback 硬编码、集成脚本先读既有断言
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-014 提交前自检：三类"写完才发现"的返工（本会话实证）

**终态**（2026-10-26，三个真实返工现场，共性=错误发现时点太晚）：

1. **black/flake8 两轮红**：新文件写完直接进 pre-check，格式化错误到 lint 阶段
   才暴露（2 files would be reformatted → 修完再红 F401 未用 import）。
   **根因**：`.pre-commit-config.yaml` 存在但 hook **从未安装**（.git/hooks/
   只有 sample；安装方式写在配置文件头注释里没人执行）——「有配置无落地」
   与 ENG-003 缺口⑤（Django admin 零注册）同款模式。**修法**：新环境第一步
   `pre-commit install`；未装时提交前手动跑 `make lint-backend` 的同款命令。
2. **t() fallback 硬编码中文**：新按钮写 `t("codes.actions", "操作")`——
   前端 CLAUDE.md 禁硬编码文案，**fallback 参数是逃生门不是默认路径**；
   语言包 key 后补了一遍。**修法**：写组件前先加双语 key（ru+zh 一起），
   t() 不带 fallback 参数（让缺失在渲染期可见）。
3. **集成脚本对响应契约三次假设错**：python 版 drill 对 approve 响应（无 data
   包络）、checkout 响应（无 order_id，需再查列表）、cart/add（201 非 200）
   全部按想当然写，逐个运行时才暴露。**修法**：写集成/验收脚本前先读**既有
   测试对该端点的响应断言**（tests/ 是契约的活文档）——与
   [KNW-B1-EXP-010](KNW-B1-EXP-010-dod1-offline-verification.md) 硬断言纪律
   姊妹篇：断言的期望值要先核实来源，不是拍脑袋。

**何时读**：新环境首次提交前；写 i18n 文案/新组件时；写集成/验收脚本对端点
响应做假设时；「lint 到提交末端才红」反复出现时。

**处置纪律**：
1. 新环境 checklist 首项：`pre-commit install`（配置文件存在 ≠ hook 生效）；
2. 代码顺序：语言包 key → 组件 t() → 渲染验证；**t() 不写 fallback 字面量**；
3. 集成脚本动笔前先 grep tests/ 里同端点的断言（响应包络/状态码/字段名）。

关联：[KNW-B1-EXP-006](KNW-B1-EXP-006-sprint-branch-commit-discipline.md)
（提交纪律的格式面补充）、[ENG-003](../engineering/B1RU-ENG-003-admin-func-role-matrix.md)
（「有配置无落地」同款缺口清单）。
