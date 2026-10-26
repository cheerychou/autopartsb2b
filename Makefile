# B1-RU 开发管理 Makefile（承 CDD3 命令体系模式）

.PHONY: help dev dev-backend dev-frontend migrate makemigrations test test-backend test-backend-pg test-frontend api-types check-schema-drift
.PHONY: lint lint-backend lint-frontend type-check schema pre-check install install-backend install-frontend

.DEFAULT_GOAL := help
BACKEND_DIR := backend
FRONTEND_DIR := frontend

help: ## 显示帮助
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: install-backend install-frontend ## 安装全部依赖
install-backend: ## 后端依赖（venv）
	cd $(BACKEND_DIR) && python3.13 -m venv venv && ./venv/bin/pip install -r requirements.txt -r requirements-dev.txt
install-frontend: ## 前端依赖
	cd $(FRONTEND_DIR) && pnpm install

dev: dev-backend ## 默认：起后端
dev-backend: ## 起后端开发服务器
	cd $(BACKEND_DIR) && ./venv/bin/python manage.py runserver
dev-frontend: ## 起两前端（两终端分别跑更清晰）
	cd $(FRONTEND_DIR) && pnpm --filter storefront-web dev
	cd $(FRONTEND_DIR) && pnpm --filter admin-web dev

makemigrations: ## 创建迁移
	cd $(BACKEND_DIR) && ./venv/bin/python manage.py makemigrations
migrate: ## 执行迁移（只向前兼容）
	cd $(BACKEND_DIR) && ./venv/bin/python manage.py migrate

test: test-backend test-frontend ## 全量测试
test-backend: ## 后端 pytest（封闭 SQLite；PG 档另跑 test-backend-pg）
	cd $(BACKEND_DIR) && B1RU_TEST_SQLITE=1 B1RU_AUTH_THROTTLE_RATE=10000/min ./venv/bin/pytest
test-backend-pg: ## PG 真库测试档（并发行锁等仅 PG 有真语义；本机 PG 起 dev compose db 或 brew 实例于 5433）
	cd $(BACKEND_DIR) && B1RU_AUTH_THROTTLE_RATE=10000/min ./venv/bin/pytest
test-frontend: ## 前端两应用测试
	cd $(FRONTEND_DIR) && pnpm -r test:run

lint: lint-backend lint-frontend ## 全量 lint
lint-backend:
	cd $(BACKEND_DIR) && ./venv/bin/black --check --line-length=100 . && ./venv/bin/isort --check-only . && ./venv/bin/flake8 .
lint-frontend:
	cd $(FRONTEND_DIR) && pnpm -r lint

type-check: ## 前端类型检查
	cd $(FRONTEND_DIR) && pnpm -r type-check

schema: ## 导出 OpenAPI schema（类型管线第 1 步）
	cd $(BACKEND_DIR) && ./venv/bin/python manage.py spectacular --file schema.yml

api-types: schema ## 类型管线 round-trip：导出 OpenAPI → 生成两端 TS 类型（后端契约改动后必跑）
	cd $(FRONTEND_DIR) && pnpm --filter storefront-web generate:api-types && pnpm --filter admin-web generate:api-types

check-schema-drift: ## schema 漂移检测：重导前后自比（变了=文件落后于代码；与是否已提交无关）
	@before=$$(mktemp) && cp backend/schema.yml "$$before" \
		&& $(MAKE) --no-print-directory schema \
		&& { diff -q "$$before" backend/schema.yml >/dev/null || \
			{ echo "❌ backend/schema.yml 落后于代码——已自动重导（连带跑 make api-types 同步两端类型），请 git add 提交更新"; exit 1; }; } \
		&& rm -f "$$before" && echo "✅ schema 无漂移"

pre-check: lint type-check test-backend test-frontend check-schema-drift ## 提交前全量预检（含禁止模式）
	@bash scripts/ci/check-banned-patterns.sh
	@echo "✅ pre-check 全绿（schema 三连请按 .zcode/skills/pre-check-before-pr 手动执行）"
