---
doc_id: KNW-B1-EXP-012
title: shell/命令行执行陷阱集——set -e 不保护 && 列表/全角字符并入变量名/cwd 错位四连
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-012 shell/命令行执行陷阱（DoD1 drill 脚本与本会话实证）

**终态**（2026-10-26，四个真实踩坑，全部有复现现场）：

1. **`set -e` 对 `A && B` 列表失败不退出**：bash 规则——`&&`/`||` 列表里非最后
   命令的失败不触发 set -e。实证：dod1-offline-drill.sh 中
   `createsuperuser ... && init_rbac --assign`——createsuperuser 缺 EMAIL 报
   CommandError 后 init_rbac 被**静默短路**，owner 没建成，脚本带病跑到 [6/6]
   才在别处爆。**修法**：关键步骤拆成独立语句（每句独立受 set -e 保护）；
   或 `A && B || { echo 失败; exit 1; }` 显式兜底。
2. **bash 变量名紧贴全角字符**：`echo "（HTTP $code，容器内自探）"`——全角逗号
   被并入变量名 → `code✈: unbound variable`（报错处显示乱码）。**修法**：变量
   一律 `${var}` 花括号包裹——脚本里含 CJK 文案时是必选项不是风格项。
3. **多级目录仓库 cwd 错位**（本会话 ≥4 次）：backend/ 子目录里跑 make
   （No rule to make target）；python 脚本用仓库根相对路径但 cwd 在 frontend/
   （FileNotFoundError ×2）。**修法**：编排脚本开头
   `cd "$(dirname "$0")/../.."` 自锚定仓库根；临时 python 片段开头
   `pathlib.Path` 用绝对路径或先 `assert (Path.cwd() / "锚点文件").exists()`。
4. **buildx `--driver-opt A B`**：两个 opt 写成一个 flag 的两个值，第二个被当
   endpoint 解析报 invalid bind address。**修法**：每个 opt 各带一次
   `--driver-opt`。

**何时读**：写 bash 编排脚本（drill/部署/检查类）；脚本行为"跑到一半带病继续"
或"报 unbound variable"时；多级目录仓库里临时命令反复 FileNotFoundError 时。

**处置纪律**：编排脚本内**禁止用 `&&` 串联关键步骤**（set -e 语义陷阱）；
CJK 注释/文案旁的变量必加花括号；脚本第一行自锚定 cwd。

关联：[KNW-B1-EXP-010](KNW-B1-EXP-010-dod1-offline-verification.md)（该脚本的
断言纪律面）。
