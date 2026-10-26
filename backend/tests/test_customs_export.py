"""P0 缺口③回归：F-16 报关清单导出（25号§一.5，2026-12-01 合规 deadline）。

CSV（UTF-8 BOM）逐码申报明细：批次全量码（不筛状态）+ 报关单号 + 商品申报字段。
"""

import csv
import io

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from commerce.services_codes import create_batch, import_code_list

pytestmark = pytest.mark.django_db


@pytest.fixture
def marked_product(catalog_spu_factory):
    from commerce.models_codes import MarkedCategoryDict
    from commerce.services import create_product_from_catalog

    MarkedCategoryDict.objects.create(tnved_prefix="8708 30", category_label="刹车盘片")
    spu = catalog_spu_factory()
    spu.harmonized_code = "8708 30 910"
    spu.save(update_fields=["harmonized_code"])
    return create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Колодки тормозные",
        price_amount=1200.00,
    )


@pytest.fixture
def staff_api():
    from django.core.management import call_command

    call_command("init_rbac")
    u = User.objects.create_user(username="cx_staff", password="x")
    u.groups.add(Group.objects.get(name="staff"))
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    return api


def test_customs_export_csv_full_rows(marked_product, staff_api):
    from commerce.services_codes import receive_batch

    batch = create_batch(batch_no="B-CX-1", customs_declaration=" customs ")
    batch.customs_declaration = "ТД-2026-777"
    batch.save(update_fields=["customs_declaration"])
    import_code_list(batch=batch, product=marked_product, code_values=["DM-CX-001", "DM-CX-002"])
    receive_batch(batch)  # 全部入转——报关清单不筛状态，两码都应在

    r = staff_api.get("/api/v1/batches/B-CX-1/customs-export/")
    assert r.status_code == 200
    assert r["Content-Type"].startswith("text/csv")
    assert "customs-B-CX-1.csv" in r["Content-Disposition"]

    body = r.content.decode("utf-8")
    assert body.startswith("﻿")  # BOM（Excel 编码识别）
    rows = list(csv.reader(io.StringIO(body)))
    assert rows[0][0].lstrip("\ufeff") == "批次号"  # 首单元格带 BOM（Excel 识别用，预期内）
    data = [row for row in rows[1:] if row]
    assert len(data) == 2
    assert all(row[0] == "B-CX-1" and row[1] == "ТД-2026-777" for row in data)
    assert {row[6] for row in data} == {"DM-CX-001", "DM-CX-002"}
    assert data[0][4] == "8708 30 910"  # ТН ВЭД 申报字段
    assert "已入库" in rows[1][7] or any("库" in row[7] for row in data)  # 状态为可读文案


def test_customs_export_rejects_buyer(marked_product):
    api = APIClient()
    r = api.post(
        "/storefront/v1/auth/register",
        {"username": "cx_buyer", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    token = r.json()["data"]["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    r2 = api.get("/api/v1/batches/B-CX-404/customs-export/")
    assert r2.status_code == 403  # 买家 JWT 非 admin 角色——fail-closed
