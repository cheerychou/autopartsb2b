# B1-RU 交付单元（deploy/）

单部署单元 = Django 后端容器 + PostgreSQL（24号 SKU-B 私有化、断网自足）。
前端两应用为静态产物（构建后由任意静态服务器/客户网关托管，见 §5）。

> **统一约定**：以下所有 `docker compose` 命令均在 `deploy/` 目录执行，
> 且必须显式带 `--env-file b1ru.env`——compose 插值**只**自动读 `.env`，
> 不会读 b1ru.env；漏带时 db 口令插值直接报错（fail-fast，2026-10-26 走查实证）。

## 1. 离线交付流程（在有网机器上准备，目标环境零外联）

```bash
# 有网机器：
docker compose --env-file b1ru.env build           # 或 docker build 参数见 Dockerfile
docker save b1ru-backend:latest postgres:16-alpine | gzip > b1ru-images.tar.gz
# 前端静态产物构建见 §5。拷贝 deploy/ 整目录 + b1ru-images.tar.gz 到目标环境
# （目标环境无需代码仓库：镜像已 load，compose up 不会触发 build）

# 目标环境（无外联）：
gunzip -c b1ru-images.tar.gz | docker load
cp b1ru.env.example b1ru.env   # 填写 DJANGO_SECRET_KEY / PGPASSWORD / DJANGO_ALLOWED_HOSTS
docker compose --env-file b1ru.env up -d
curl http://localhost:${B1RU_PORT:-8000}/api/health/     # {"status":"ok"} 即起
```

## 2. 启动时自动完成（entrypoint）

等库就绪 → `migrate`（只向前兼容，24号§六.1）→
`init_rbac`（4 角色组）→ 可选超管（`DJANGO_SUPERUSER_USERNAME/PASSWORD` 存在时）→
gunicorn（静态产物已含于镜像，运行时不重复 collectstatic）。任何一步失败即退出，
`docker compose --env-file b1ru.env logs backend` 排查。

超管建好后入 owner 组：`docker compose --env-file b1ru.env exec backend python manage.py init_rbac --assign ops:owner`。

## 3. 初始化数据（首次部署 checklist）

> 交付物（数据包 zip / license.json）放宿主 `deploy/data/` 目录——自动只读挂载为容器 `/data`。

- [ ] 导入目录数据包（包先放 `deploy/data/`）：`docker compose --env-file b1ru.env exec backend python manage.py import_seed_package --package /data/xxx.zip`
- [ ] （可选）M1 演示词表：`... manage.py load_ru_demo_names`
- [ ] license 文件：放 `deploy/data/license.json` 并设 `b1ru.env` 中 `B1RU_LICENSE_FILE=/data/license.json`；
      验证：`... manage.py license_status --refresh`
- [ ] 到期下价调度：安装 `scheduler/`（systemd timer 或 cron，见 scheduler/README.md）
- [ ] 商城/管理端静态产物部署 + 反代 `/api/`、`/catalog/`、`/storefront/` → 后端 :8000

### 账号管理（首次部署开号 + 日常增删，缺口⑥流程）

角色单一真相源：`shared/permissions.py`（owner/staff/finance/data_steward 四角色，`init_rbac` 无参运行可打印权限概览）。

```bash
# 1) 日常业务账号不建 superuser——用 Django admin 建普通用户：
#    超管登录 http://<host>/admin/ → 用户 → 增加用户（用户名+密码）
# 2) 分配角色（--assign 用户名:角色，可重复）：
docker compose --env-file b1ru.env exec backend python manage.py init_rbac \
  --assign ivanov:staff --assign petrova:finance --assign sidorov:data_steward
# 3) 改密：/admin/ 用户页「修改密码」，或命令行：
docker compose --env-file b1ru.env exec backend python manage.py changepassword ivanov
# 4) 停用离职账号：/admin/ 用户页取消「活跃」勾选（不禁用亦可登录）
```

- `owner` 由部署时 entrypoint 自动建的超管兼任（或按上法建普通 owner 账号日常用，超管仅我方运维兜底）；
- 角色与权限码映射不可在界面改（代码常量单一真相源）；角色越权由后端 403 兜底（admin-web 侧栏当前不按角色显隐，v1 团队规模小，后端权限层为准）。

## 4. 升级与备份

- **升级**：换镜像 `docker compose --env-file b1ru.env up -d`（迁移自动执行、只向前）；目录数据升级=导入新版本包（幂等、schema 窗口校验，27号§六）
- **备份**：`pgdata` 卷即全部业务数据；用**必交付镜像**跑（离线环境没有 alpine——
  2026-10-26 走查实证）：`docker run --rm -v b1ru_pgdata:/data postgres:16-alpine tar czf - /data > backup.tar.gz`
  （卷名已显式固定为 `b1ru_pgdata`；执行后核对 tar 非空：`tar tzf backup.tar.gz | head`）
- **license 续约**：换发新 `license.json` 放 `deploy/data/`（`B1RU_LICENSE_FILE` 指向不变即生效，缓存到期或 `--refresh` 读取；信息性，不换也不锁功能）

## 5. 前端交付

```bash
cd frontend && pnpm --filter storefront-web build && pnpm --filter admin-web build
# 产物在各 app dist/——静态托管；API 反代规则：/api,/catalog,/storefront → backend:8000
```

## 6. license 签发与续约（运营方/开发商侧操作，2026-10-26 闭环验证）

机制（D3-A）：Ed25519 离线验签，**信息性四态**（valid/expired/missing/invalid）——任何状态
不拦截功能，商业杠杆=总仓对到期客户停发新包（26号§八.4「不远程锁死」）。私钥在
`~/.config/b1ru/license_private_key.pem`（勿入库勿入镜像）；公钥随代码分发。

```bash
# 首客签发 / 续约（同一命令，换 expires-at）：
backend/venv/bin/python manage.py make_license \
  --licensee "ООО Клиент" --instance-id inst-<客户标识> --tier standard \
  --expires-at 2027-10-26 --private-key ~/.config/b1ru/license_private_key.pem \
  --out license.json
# 把 license.json 交付客户：放部署环境 deploy/data/（挂载为容器 /data），
# b1ru.env 设 B1RU_LICENSE_FILE=/data/license.json（缺省 /app/license.json，docker cp 可用）

# 实例侧查看（信息性）：
python manage.py license_status --refresh   # valid/expired/missing/invalid + days_left
```

- 结果缓存 24h（每日校验语义）；--refresh 强制重读；
- 续约=换发新文件替换旧文件，替换后生效（无需重启；缓存到期或 --refresh 即读新）；
- 篡改 payload 不重签 → invalid（字段清空）；全流程守卫：tests/test_license.py（9 例）。

## 7. 纪律提醒

- 新增任何常驻服务/外联属于**部署形态变更**，须委托方批准（铁律 3）
- `b1ru.env` 不入库；镜像内已含静态产物，无需运行时 collectstatic
- 本目录变更属"高危域"评审范围（REVIEW.md P4：交付单元）
