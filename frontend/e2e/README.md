# B1-RU e2e（Playwright，跨两端 UI 业务链）

## 前置：外部起栈（本包不做 webServer 托管——栈含 Django 侧）

```bash
# 1) 后端 :8001（SQLite + 演示数据；数据包幂等可重灌）
cd backend
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py migrate
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package --package ../deploy/demo/B1RU-CAT-DEMO-INIT-0001.zip
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package --package ../deploy/demo/B1RU-CAT-DEMO-DELTA-0002.zip
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py seed_demo_commerce
B1RU_TEST_SQLITE=1 DJANGO_SUPERUSER_USERNAME=b1owner DJANGO_SUPERUSER_EMAIL=ops@b1ru.local \
  DJANGO_SUPERUSER_PASSWORD=Demo-Owner-2026! ./venv/bin/python manage.py createsuperuser --noinput
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py init_rbac --assign b1owner:owner
B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py runserver 127.0.0.1:8001

# 2) 两端 dev（B1RU_API_TARGET 指 8001）
pnpm --filter storefront-web dev   # :5174
pnpm --filter admin-web dev        # :5175

# 3) 首次：安装浏览器
cd e2e && npx playwright install chromium
```

## 运行

```bash
pnpm test          # 全部（workers=1 串行——两端共享一个后端库）
pnpm test:headed   # 有头观察
pnpm report        # 失败截图/trace 报告
```

## 场景

| 文件 | 链路 | 断言要点 |
|---|---|---|
| corporate-flow.spec.ts | 游客找件→企业注册→见价→加购→pending 结算门控 | 游客无价/按钮禁用；pending 提示+下单禁用（API 403 为纵深防御） |
| admin-fulfillment.spec.ts | admin 审核→核销→发货 + storefront 签收 | 金额预填核销；状态行 paid→shipped→completed |

覆盖哲学（承 KNW-011）：UI 层只测「渲染+交互+门控表现」，业务正确性由 API 层
drill/test 守卫——两层互备，不重复。
