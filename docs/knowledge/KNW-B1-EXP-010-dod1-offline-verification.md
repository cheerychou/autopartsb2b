---
doc_id: KNW-B1-EXP-010
title: DoD 1 断网自足验证——L1 静态审计 + L2 internal 网络演练，bash 演示脚本无断言掩盖 ship 响应契约 bug
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-010 DoD 1 断网自足验证（26号§九）与 bash 演示脚本的断言盲区

**终态**（2026-10-26，`deploy/demo/dod1-offline-drill.sh` 全链路通过，订单
ORD202610260001 completed）：

## 验证方法（两层级，均可复跑）

1. **L1 静态审计**（零依赖）：后端 grep HTTP 客户端 import（requests/httpx/
   urllib/socket）= 零；settings 无 celery/redis/CACHES 实际引用（requirements
   挂名未用）；前端无 CDN/外链字体（唯一 URL 是生成文件的 OpenAPI 注释）。
2. **L2 internal 网络演练**：交付单元（deploy/docker-compose.yml）叠加脚本内联
   override——backend+db 置 `internal: true` 网络（出站 DNS 直接失败），断网
   证明 =「容器内外联必败 + 容器内连 db 必成」；随后数据包 INIT/DELTA 灌入 +
   **网内客户端容器**跑 `m1-alpha-drill.py` 六步全链路（纯标准库 urllib，硬断言）。

## 本机构建环境坑位（registry 不可达时的替代路线，已固化进脚本 [2/6]）

- `auth.docker.io` DNS 污染（解析到 108.x/159.x）且 Docker VM 不走系统代理
  （127.0.0.1:7897）→ compose build 的 metadata resolve 超时；
- 绕行 = **FROM 用本地基础镜像 RepoDigest 引用**（`docker inspect --format
  '{{index .RepoDigests 0}}'`，值自带 `python@` 前缀——**直接用，别再拼
  `python@`**，双拼 = invalid reference format）+ `--build-arg HTTP_PROXY`
  （docker 预定义 arg，直进 RUN 供 pip 走宿主代理）+ `docker --context=default
  buildx`（default context 名直呼报错）；
- Docker Desktop 宿主端口转发面可能与容器状态不同步（HostConfig 已绑、宿主
  无监听，restart 无效）→ **验证逻辑别依赖端口映射**：探活用容器内自探，全链路
  用网内客户端容器（`docker run --network <compose网络>`），顺带断网语义更纯粹。

## 副产品：ship 响应契约 bug（P1-2 同型漏网点，已修）

bash 版 m1-alpha-drill.sh 只打印不断言 → ⑧ 发货步骤响应 `status: paid,
tracking_no: ''`（旧对象）数月未被发现；python 版硬断言立刻暴露：ship 视图
**未接收服务层返回值**（P1-2 修 confirm/cancel 时漏了 ship）。修复 + 回归
`test_ship_response_contract`。附带观察项：approve 端点响应未走 `data` 包络
（29号契约一致性，类型管线/前端联调时收口）。

**何时读**：DoD 1 验收/复验；交付单元构建遇 registry 不可达；端口映射不生效时；
给演示/验收脚本加断言前（为何 bash 打印式脚本不可信）。

**处置纪律**：
1. 验收脚本必须**硬断言**响应关键字段——「能跑通」与「响应正确」是两回事；
2. 涉断网/离线的验证，客户端与探活一律放目标网络内部，不经宿主转发面；
3. `docker inspect` 的 RepoDigests 值是完整引用（含仓库名@），拼引用前先看值。

关联：[KNW-B1-EXP-007](KNW-B1-EXP-007-m1-demo-pack-drill.md)（六步动线来源）、
[KNW-B1-EXP-005](KNW-B1-EXP-005-data-assertion-baseline.md)（实证纪律）。
