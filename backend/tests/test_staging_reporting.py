"""S5 补充：I4 补录回流导出（27号§十）+ F-17 报表。"""

import io
import tarfile

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_category import Category
from catalog.models_product import SPU
from catalog.models_staging import FeedExportLog, StagedFitment

pytestmark = pytest.mark.django_db


@pytest.fixture
def steward_api():
    from django.core.management import call_command
    from rest_framework_simplejwt.tokens import RefreshToken

    call_command("init_rbac")
    u = User.objects.create_user(username="steward", password="x")
    u.groups.add(Group.objects.get(name="data_steward"))
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    return api, u


@pytest.fixture
def fitment_seed():
    brand = Brand.objects.create(
        brand_code="BRS",
        brand_name="博世S",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0S9001",
        spu_name="火花塞S",
        brand_id=brand,
        product_type="part",
        oe_number="T44-999999",
        spu_status="active",
    )
    return spu


# ---------- I4（F-23） ----------


def test_staging_requires_steward(fitment_seed):
    """暂存读写限 data_steward（匿名 fail-closed 403）。"""
    api = APIClient()
    assert api.get("/catalog/v1/staging/fitments").status_code == 403
    assert api.post("/catalog/v1/staging/fitments", {}, format="json").status_code == 403
    assert api.post("/catalog/v1/staging/export-feed").status_code == 403


def test_staging_create_and_export_feed(steward_api, fitment_seed):
    """补录→暂存→FEED 导出（tar.gz 含 manifest+data/fitments.json，origin=local）。"""
    api, _ = steward_api
    r = api.post(
        "/catalog/v1/staging/fitments",
        {
            "spu": str(fitment_seed.spu_id),
            "qualifiers": {"ENGINE": "1.6T"},
            "year_from": 2021,
            "year_to": 2025,
            "note": "首客共建补录",
        },
        format="json",
    )
    assert r.status_code == 201, r.content

    # 匿名/无关账号不可见暂存数据
    anon = APIClient()
    assert anon.get("/catalog/v1/staging/fitments").status_code == 403

    # 空导出防御已在 service 层；先验证有行可导
    r2 = api.post("/catalog/v1/staging/export-feed")
    assert r2.status_code == 200
    assert r2["Content-Type"] == "application/gzip"
    feed_id = r2["Content-Disposition"].split('filename="')[1].removesuffix('.tar.gz"')
    assert feed_id.startswith("FEED-")

    # 包结构：tar.gz 含 manifest.json + data/fitments.json，origin=local
    tf = tarfile.open(fileobj=io.BytesIO(r2.content))
    names = tf.getnames()
    assert "manifest.json" in names and "data/fitments.json" in names
    manifest = tf.extractfile("manifest.json").read()
    assert b'"origin": "local"' in manifest or b'"origin":"local"' in manifest

    # 导出后暂存行置 exported；再次导出 409（无新 draft）
    row = StagedFitment.objects.first()
    assert row.status == "exported"
    r3 = api.post("/catalog/v1/staging/export-feed")
    assert r3.status_code == 409
    assert FeedExportLog.objects.filter(feed_id=feed_id).exists()


# ---------- F-17 报表 ----------


def test_reports_endpoint(steward_api, fitment_seed):
    api, _ = steward_api
    cat = Category.objects.create(
        category_code="RPT",
        category_name="报表类目",
        category_type="back",
        category_level="level3",
        node_type="leaf",
        category_status="active",
    )
    brand = Brand.objects.create(
        brand_code="BRR2",
        brand_name="报表品牌",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    from catalog.models_category import CategorySPU

    spu = SPU.objects.create(
        spu_code="P0R9001",
        spu_name="覆盖件",
        brand_id=brand,
        product_type="part",
        oe_number="T33-111111",
        spu_status="active",
    )
    CategorySPU.objects.create(category=cat, spu=spu, is_primary=True)
    resp = api.get("/api/v1/reports/catalog-coverage/")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["leaf_total"] >= 1 and body["leaf_covered"] >= 1

    resp = api.get("/api/v1/reports/sales/")
    assert resp.status_code == 200
    resp = api.get("/api/v1/reports/slow-movers/")
    assert resp.status_code == 200
    resp = api.get("/api/v1/reports/codes-aging/")
    assert resp.status_code == 200
