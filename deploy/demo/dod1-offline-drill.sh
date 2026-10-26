#!/usr/bin/env bash
# DoD 1 断网自足验证（26号§九：停外网出向后买家全流程可用）
#
# 方法：交付单元（deploy/docker-compose.yml）叠加深色 override——backend+db 置于
# docker internal 网络（无默认路由，出站外联全拒）；宿主机端口映射不受影响
# （买家视角 = 只依赖本单元）。断网证明 = 容器内出站外联必须失败 + 容器内连 db
# 必须成功（内通外断），再复跑 m1-alpha-drill.sh 六步买家全链路。
#
# 用法（任意目录）：deploy/demo/dod1-offline-drill.sh
# 注意：脚本会 down -v 清 pgdata 卷重来（卷内仅演示数据，可重灌）。
# build 走默认网络（pip 依赖需要网）——断网的是运行期，符合"导入后离线运行"。
set -euo pipefail
# Docker Desktop 自带的 credential helper（credsStore=osxkeychain 时 build/pull 需要）
# 不一定在用户 PATH 上——补上，目录不存在则无副作用
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT="${B1RU_PORT:-8000}"
# env-file 前置进数组：所有命令（含失败 fallback 的 logs）统一携带
OFFLINE_YML=/tmp/b1ru-compose-offline.yml
COMPOSE_FILES=(--env-file deploy/b1ru.env -f deploy/docker-compose.yml -f "$OFFLINE_YML")
C="docker compose ${COMPOSE_FILES[*]}"

step() { echo; echo "======== $* ========"; }

# ---- 深色 override（不入库素材之外的临时件，脚本内联生成）----
cat > "$OFFLINE_YML" <<YAML
services:
  backend:
    networks: [offline]
    environment:
      DJANGO_ALLOWED_HOSTS: "backend,localhost,127.0.0.1"
    volumes:
      - ${ROOT}/deploy/demo:/packs:ro
  db:
    networks: [offline]
networks:
  offline:
    driver: bridge
    internal: true
YAML

step "[1/6] 清场（down -v，pgdata 卷内仅演示数据）"
docker compose "${COMPOSE_FILES[@]}" down -v >/dev/null 2>&1 || true

step "[2/6] build 镜像 + 断网启动交付单元"
# 构建路线三选一：
#   SKIP_BUILD=1                    → 复用既有镜像（须自行保证与当前代码一致）
#   默认（registry 可达）           → docker compose build backend
#   registry 不可达（DNS 污染等）   → 本地基础镜像 digest 引用 + 代理 build-arg
#                                     （HTTP_PROXY 是 docker 预定义 arg，直进 RUN 环境供 pip 用；
#                                      FROM 走本地 RepoDigest 免 registry 解析。代理默认宿主 7897，
#                                      用 B1RU_BUILD_PROXY 覆盖；本地基础镜像用 PYTHON_IMAGE_LOCAL）
if [ -n "${SKIP_BUILD:-}" ]; then
  echo "SKIP_BUILD=1：跳过构建"
elif docker compose "${COMPOSE_FILES[@]}" build backend 2>/dev/null; then
  echo "compose build 成功"
else
  digest=$(docker inspect "${PYTHON_IMAGE_LOCAL:-python:3.12-slim}" --format '{{index .RepoDigests 0}}')
  proxy="${B1RU_BUILD_PROXY:-http://host.docker.internal:7897}"
  echo "registry 不可达 → FROM $digest + 代理 $proxy"
  docker --context=default buildx build -f backend/Dockerfile \
    --build-arg "PYTHON_IMAGE=$digest" \
    --build-arg "HTTP_PROXY=$proxy" --build-arg "HTTPS_PROXY=$proxy" \
    -t b1ru-backend:latest --load .
fi
$C up -d

step "[3/6] 等 backend 就绪（entrypoint: 等 PG→migrate→collectstatic→init_rbac→gunicorn）"
# 容器内自探（不走宿主转发面——Desktop 转发面与容器状态可能不同步）
for i in $(seq 1 60); do
  code=$($C exec backend python -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/catalog/v1/brands',timeout=3).status)" 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "${code:-}" = "200" ] || { echo "backend 120s 未就绪"; docker compose "${COMPOSE_FILES[@]}" logs backend | tail -20; exit 1; }
echo "backend 就绪（HTTP ${code}，容器内自探）"

step "[4/6] 断网证明：容器内「外联必败 + 内通必成」"
$C exec backend python - <<'EOF'
import os, socket, sys, urllib.request

socket.setdefaulttimeout(6)
try:
    urllib.request.urlopen("https://crpt.ru")  # ЧЗ 官网——白名单外联的代表
    print("✗ 外联通了——断网失效"); sys.exit(1)
except Exception as e:
    print(f"✓ 出站被拒（断网生效）: {type(e).__name__}: {e}")

import psycopg
with psycopg.connect(
    host=os.environ["PGHOST"], port=int(os.environ["PGPORT"]),
    dbname=os.environ["PGDATABASE"], user=os.environ["PGUSER"],
    password=os.environ["PGPASSWORD"], connect_timeout=3,
):
    print("✓ 容器内连 db 成功（单元内部互通）")
EOF

step "[5/6] 灌演示数据 + 建 owner（全部容器内命令，零外联）"
$C exec backend python manage.py import_seed_package --package /packs/B1RU-CAT-DEMO-INIT-0001.zip | tail -1
$C exec backend python manage.py import_seed_package --package /packs/B1RU-CAT-DEMO-DELTA-0002.zip | tail -1
$C exec backend python manage.py seed_demo_commerce | tail -1
$C exec backend sh -c "DJANGO_SUPERUSER_USERNAME=b1owner DJANGO_SUPERUSER_EMAIL=ops@b1ru.local DJANGO_SUPERUSER_PASSWORD=Demo-Owner-2026! python manage.py createsuperuser --noinput"
$C exec backend python manage.py init_rbac --assign b1owner:owner

step "[6/6] 买家六步全链路（offline 网内客户端容器执行——不经宿主转发面，断网语义更纯粹）"
client_ref=$(docker inspect "${PYTHON_IMAGE_LOCAL:-python:3.12-slim}" --format '{{index .RepoDigests 0}}')
network="${B1RU_NET:-deploy_offline}"
docker run --rm --network "$network" \
  -v "$ROOT/deploy/demo/m1-alpha-drill.py:/drill.py:ro" \
  "$client_ref" python /drill.py

step "✅ DoD 1 断网自足验证通过（内通外断 + 六步全链路）"
echo "清理：docker compose -f deploy/docker-compose.yml --env-file deploy/b1ru.env down -v"
