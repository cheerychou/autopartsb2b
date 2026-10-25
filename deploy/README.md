# B1-RU 交付单元（deploy/）

单部署单元 = Django 后端容器 + PostgreSQL（24号 SKU-B 私有化、断网自足）。
前端两应用为静态产物（构建后由任意静态服务器/客户网关托管，见 §5）。

## 1. 离线交付流程（在有网机器上准备，目标环境零外联）

```bash
# 有网机器：
docker compose --env-file b1ru.env build           # 或 docker build 参数见 Dockerfile
docker save b1ru-backend:latest postgres:16-alpine | gzip > b1ru-images.tar.gz
# 拷贝 deploy/ + b1ru-images.tar.gz + backend 前端静态产物 到目标环境

# 目标环境（无外联）：
gunzip -c b1ru-images.tar.gz | docker load
cp b1ru.env.example b1ru.env   # 填写 SECRET_KEY / PGPASSWORD / ALLOWED_HOSTS
docker compose up -d
curl http://localhost:8000/api/health/     # {"status":"ok"} 即起
```

## 2. 启动时自动完成（entrypoint）

等库就绪 → `migrate`（只向前兼容，24号§六.1）→ `collectstatic` →
`init_rbac`（4 角色组）→ 可选超管（`DJANGO_SUPERUSER_USERNAME/PASSWORD` 存在时）→
gunicorn。任何一步失败即退出，`docker compose logs backend` 排查。

超管建好后入 owner 组：`docker compose exec backend python manage.py init_rbac --assign ops:owner`。

## 3. 初始化数据（首次部署 checklist）

- [ ] 导入目录数据包：`docker compose exec backend python manage.py import_seed_package --package /data/xxx.zip`
- [ ] （可选）M1 演示词表：`... manage.py load_ru_demo_names`
- [ ] license 文件：放置 `license.json` 于容器内 `/app/`（或设 `B1RU_LICENSE_FILE`）；
      验证：`... manage.py license_status --refresh`
- [ ] 到期下价调度：安装 `scheduler/`（systemd timer 或 cron，见 scheduler/README.md）
- [ ] 商城/管理端静态产物部署 + 反代 `/api/`、`/catalog/`、`/storefront/` → 后端 :8000

## 4. 升级与备份

- **升级**：换镜像 `docker compose up -d`（迁移自动执行、只向前）；目录数据升级=导入新版本包（幂等、schema 窗口校验，27号§六）
- **备份**：`pgdata` 卷即全部业务数据；`docker run --rm -v b1ru_pgdata:/data alpine tar czf - /data > backup.tar.gz`
- **license 续约**：换 `license.json` 重启（信息性，不换也不锁功能）

## 5. 前端交付

```bash
cd frontend && pnpm --filter storefront-web build && pnpm --filter admin-web build
# 产物在各 app dist/——静态托管；API 反代规则：/api,/catalog,/storefront → backend:8000
```

## 6. 纪律提醒

- 新增任何常驻服务/外联属于**部署形态变更**，须委托方批准（铁律 3）
- `b1ru.env` 不入库；镜像内已含静态产物，无需运行时 collectstatic
- 本目录变更属"高危域"评审范围（REVIEW.md P4：交付单元）
