"""
B1-RU Django settings（单租户运行；私有化部署）。

部署纪律（24号）：断网自足——除支付网关与 ЧЗ API 外无在线依赖；
数据库迁移只向前兼容。
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ---- 环境分档与 fail-safe（评审二节：私有化交付应 fail-safe——生产缺配置拒绝启动，
# 而不是带着 dev 默认值上线）。本地开发零配置可跑；production 档缺任一关键项即拒绝启动。----
DJANGO_ENV = os.environ.get("DJANGO_ENV", "development")  # development | production
_IS_PROD = DJANGO_ENV == "production"


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"production 启动被拒绝：缺少环境变量 {name}"
            "（fail-safe——禁止以默认值上线，评审 2026-10-25）"
        )
    return value


SECRET_KEY = (
    _require_env("DJANGO_SECRET_KEY")
    if _IS_PROD
    else os.environ.get("DJANGO_SECRET_KEY", "dev-only-change-me")
)
DEBUG = (not _IS_PROD) and os.environ.get("DJANGO_DEBUG", "1") == "1"
if _IS_PROD:
    _allowed = _require_env("DJANGO_ALLOWED_HOSTS")
    ALLOWED_HOSTS = [h.strip() for h in _allowed.split(",") if h.strip()]
else:
    ALLOWED_HOSTS = ["*"]  # 开发档；production 由上方 fail-safe 强制显式配置

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    # 域模块（23号三模块架构：catalog 只读 / commerce 交易）
    "catalog",
    "commerce",
    # 共享（RBAC/管理命令；无模型）
    "shared",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # 生产静态直服务（deploy 单容器交付）
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

if os.environ.get("B1RU_TEST_SQLITE") == "1":
    # 无 PG 环境的封闭测试（make test-backend 设此开关；CI/开发走上方 PG）
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("PGDATABASE", "b1ru"),
            "USER": os.environ.get("PGUSER", "b1ru"),
            "PASSWORD": os.environ.get("PGPASSWORD", "b1ru_dev"),
            "HOST": os.environ.get("PGHOST", "localhost"),
            "PORT": os.environ.get("PGPORT", "5433"),
        }
    }

LANGUAGE_CODE = "zh-hans"  # Django admin 兜底语言；两端 SPA 各自 i18n（均 ru+zh，26号§六）
TIME_ZONE = "Europe/Moscow"  # 交易时区锚定俄境（对账口径）
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # collectstatic 产物（whitenoise 生产服务）

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# 认证（S3 起）：SimpleJWT——买家 storefront 与管理端共用签发体系（买家 token 关联
# buyer_account，门控在 services_buyer.resolve_buyer；管理端走 RBAC 默认链）
# ---- 离线 license（D3-A，2026-10-26）：文件验签、信息性校验（shared/licensing.py）----
LICENSE_FILE = os.environ.get("B1RU_LICENSE_FILE", str(BASE_DIR / "license.json"))
LICENSE_PUBLIC_KEY = os.environ.get(
    "B1RU_LICENSE_PUBLIC_KEY", str(BASE_DIR / "shared" / "license_public_key.pem")
)
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "shared.permissions.RoleBasedPermission",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,  # 29号§二：默认 20 上限 100
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
}

SPECTACULAR_SETTINGS = {
    "TITLE": "B1-RU API",
    "VERSION": "v1",
    "SERVE_INCLUDE_SCHEMA": False,
    # 线格式 snake_case 守卫的契约面（CDD3 同类纪律）
    "COMPONENT_SPLIT_REQUEST": True,
}
