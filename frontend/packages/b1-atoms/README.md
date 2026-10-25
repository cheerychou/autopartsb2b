# @cdd/ui-registry — 原子组件唯一源

CDD Web 端（store-web / platform-web / data-platform-web）共有原子组件的**唯一源**，通过 shadcn registry 机制分发，治理三应用各自拷贝导致的实现漂移。

## 结构

```
packages/ui-registry/
├── registry.json     # registry 定义（name: @cdd/atoms，12 个组件 item）
├── src/              # 唯一源源码（改动只能发生在这里）
│   ├── *.tsx         # 12 个共有原子组件
│   └── variants/     # Button/Badge cva variants 伴生文件
└── public/r/         # shadcn build 产物（提交进仓库，供 add 消费）
```

## 标准改动流程

```bash
# 1. 改唯一源
$EDITOR packages/ui-registry/src/<component>.tsx

# 2. 重建 registry 产物（public/r/，需提交）
cd packages/ui-registry && pnpm exec shadcn build

# 3. 分发到各应用（--diff 先审再 --overwrite，禁止盲覆盖）
cd ../platform-web   # 或 store-web / data-platform-web
https_proxy=http://127.0.0.1:7897 pnpm exec shadcn add ../packages/ui-registry/public/r/<component>.json --diff
https_proxy=http://127.0.0.1:7897 pnpm exec shadcn add ../packages/ui-registry/public/r/<component>.json --overwrite

# 4. 本地跑漂移检查
cd ../.. && bash scripts/check-atom-drift.sh
```

注意：
- CLI add 需访问 ui.shadcn.com（baseColor 解析），网络不通时挂代理（SOCKS 亦可：`ALL_PROXY=socks5://...`，CLI ≥ 4.17.0）。
- CLI 对落盘文件有确定性 transform（删 `"use client"`、删文件顶部 JSDoc），因此应用文件与 `src/` 源码非逐字节一致属正常；漂移检查脚本（`scripts/check-atom-drift.sh`）已按此口径规范化比对。
- `@cdd/shared-ui`（Icons）与 `@phosphor-icons/react` 是各应用既有依赖，registry item 不声明它们，避免 CLI 改动 workspace 协议。

## 约束

- **底座：Base UI（迁移已完成）**。ENG-DEV-IMPL-014 六阶段迁移于 2026-08 收官（P0~P5），registry 全部组件基于 **`@base-ui/react`**（注意：`@base-ui-components/react` 是 1.0 稳定版之前的旧包名，已废弃勿再引入）。radix-ui 依赖已从迁移范围（root/三应用/shared-ui）卸载，ESLint `cdd/no-radix-imports` **error** 级禁止回退。CLI 固定 4.18.0（frontend 根 devDependencies，其默认底座仍为 radix——registry 的底座由**唯一源源码的 import** 决定，与 CLI 默认无关）。**新组件一律写 Base UI 实现**；组合模式速查：Trigger 系用 `render={<Button/>}`，链接形态用 `<a|Link className={buttonVariants(...)}>`，Base UI 无 Slot/asChild。Base UI 无等价物的例外依赖（cmdk、vaul）保留。
- 应用侧确需差异化时，优先把差异**参数化上收到唯一源**（如 Spinner 的 `label` prop）；确实无法上收的 fork 在 `frontend/scripts/atom-drift-allowlist.txt` 登记原因。
- **迁移批次中间态与漂移检查**：`check-atom-drift.sh` 要求应用文件与唯一源一致。迁移批次内"唯一源已改 base、应用尚未 add"的中间窗口会短暂漂移——**批次 PR 内必须完成 build + 三应用 add 分发再提交**，不允许跨 PR 携带中间态；如确需分批（如应用侧业务改造量大），在 `atom-drift-allowlist.txt` 临时登记并在同批 PR 说明中注明移除时间。
- CI 门禁：`.github/workflows/atom-registry-drift.yml`。
