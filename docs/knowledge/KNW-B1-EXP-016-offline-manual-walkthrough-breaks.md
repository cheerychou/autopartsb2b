---
doc_id: KNW-B1-EXP-016
title: 离线安装手册走查四断链——卷名前缀漂移/--env-file 不自动读/非交付镜像/systemd venv 假设
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-016 离线安装手册走查：四条「写手册时对、执行时断」的链（2026-10-26 实证）

**终态**：以「新运维按手册从零装起」为标尺做执行级走查（compose 真起/health/
导入/备份全链复演），抓到四条静态阅读发现不了的断链：

1. **具名卷前缀漂移（P0 级）**：README 备份命令写 `b1ru_pgdata`，compose 实际
   生成 `deploy_pgdata`（项目名=目录名前缀）——`docker run -v 不存在的卷` 会
   **静默建空卷**，备份产出空 tar。**修法**：compose 顶级卷显式
   `name: b1ru_pgdata`，使命令恒真、不受目录名影响；手册加「核对 tar 非空」。
2. **`--env-file` 不会被自动继承**：compose 插值只自动读同目录 `.env` 这一个
   文件名；自定义 `b1ru.env` 必须每条 `docker compose` 命令显式带
   `--env-file`——**所有子命令都做插值**（exec/logs/down 也不例外），漏带即
   报错（好在 fail-fast）。另注意：`--env-file X` 只影响插值，service 的
   `env_file:` 路径恒相对 compose 文件——两者可能指向不同文件（复演实测踩到，
   密码不一致 FATAL）。
3. **备份/工具镜像必须取自交付清单**：手册备份命令用 `alpine`——离线目标
   环境没有（必交付=postgres:16-alpine/b1ru-backend）。改用
   `postgres:16-alpine` 跑备份。**纪律：手册里出现的每个镜像名都须在
   `docker save` 清单内**。
4. **调度单元的宿主假设（P1 级）**：systemd service/crontab 写
   `cd /opt/b1ru/backend && ./venv/bin/python`——宿主机 venv 直跑，但交付
   形态是容器（目标环境无 venv）。改为
   `docker compose --env-file … exec -T backend python manage.py …`
   （-T=cron/systemd 无 tty 必需；执行用户须 docker 权限）。

**方法教训**：手册走查必须**执行级**（真起栈、真跑命令），静态通读抓不到
卷名/环境变量继承/镜像存在性这类断链；复演中「手册命令失败」先分清是手册
错了还是复演姿势错了（本次 --env-file 踩的密码不一致即复演姿势偏差，手册
标准流程无此问题——但暴露了两种 env 来源并存的脆弱点，已写进统一约定）。

**关联**：[EXP-010](KNW-B1-EXP-010-dod1-offline-verification.md)（DoD1 断网验证=运行时；本条=安装时）｜[EXP-012](KNW-B1-EXP-012-shell-command-traps.md)（命令陷阱同族）｜deploy/README（统一约定节）
