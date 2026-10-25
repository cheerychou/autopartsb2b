#!/bin/sh
# B1-RU 后端容器入口：等库→迁移→静态→RBAC→可选超管→gunicorn
# 纪律：迁移只向前兼容（24号§六.1）；任何一步失败即退出（fail-fast，生产档由
# config/settings fail-safe 拒绝缺配置启动）。
set -e
cd /app

# ---- 等 PG 就绪（slim 镜像无 pg_isready，用 psycopg 探测；最多 120s）----
python - <<'EOF'
import os, sys, time
import psycopg

params = dict(
    host=os.environ.get("PGHOST", "db"),
    port=int(os.environ.get("PGPORT", "5432")),
    dbname=os.environ.get("PGDATABASE", "b1ru"),
    user=os.environ.get("PGUSER", "b1ru"),
    password=os.environ.get("PGPASSWORD", ""),
)
for attempt in range(60):
    try:
        with psycopg.connect(**params, connect_timeout=3):
            print("postgres 就绪", flush=True)
            sys.exit(0)
    except Exception as e:
        print(f"等待 postgres…({attempt + 1}/60): {e.__class__.__name__}", flush=True)
        time.sleep(2)
print("postgres 120s 未就绪，退出", flush=True)
sys.exit(1)
EOF

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py init_rbac

# 可选：容器首启建运维超管（生产建议用 --assign 入 owner 组后禁用此账号或改密）
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    DJANGO_SUPERUSER_EMAIL="${DJANGO_SUPERUSER_EMAIL:-ops@b1ru.local}" \
        python manage.py createsuperuser --noinput \
        || echo "超管已存在，跳过（如需入组: manage.py init_rbac --assign 用户:owner）"
fi

exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
