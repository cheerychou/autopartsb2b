"""
B1-RU Django settings（单租户运行；私有化部署）。

部署纪律（24号）：断网自足——除支付网关与 ЧЗ API 外无在线依赖；
数据库迁移只向前兼容。
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = ["*"]  # 私有化部署：由反代/部署环境收紧 🟡（deploy/ 交付时定）

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

LANGUAGE_CODE = "zh-hans"  # 管理端语言；商城内容由前端 i18n 负责（ru）
TIME_ZONE = "Europe/Moscow"  # 交易时区锚定俄境（对账口径）
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# 认证（S3 起）：SimpleJWT——买家 storefront 与管理端共用签发体系（买家 token 关联
# buyer_account，门控在 services_buyer.resolve_buyer；管理端走 RBAC 默认链）
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
