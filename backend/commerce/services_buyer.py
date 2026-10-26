"""买家认证与三形态门控（F-01；31号§五🟢委托方修正）。

三种买家形态：
- guest 游客：匿名（无 JWT）——可浏览找件（I1 匿名放行），**不可见价格、不可下单**；
- buyer_individual 个人客户：注册即 approved，可下单；
- buyer_corporate 企业客户：注册后 pending，须管理端审核（F-15）approved 才可下单；
  未过审可浏览（含价格——浏览与下单分离，31号§五"可浏览不可下单"）。

认证：SimpleJWT（买家与管理端共用签发体系，token 带 buyer_account 关联）。
门控判定收敛在 resolve_buyer()——所有买家侧视图统一从这里取形态与资格。
"""

from __future__ import annotations

import dataclasses

from django.contrib.auth.models import User
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from commerce.models_customer import BuyerAccount


@dataclasses.dataclass
class Buyer:
    """请求的买家形态解析结果。"""

    kind: str  # guest / individual / corporate
    user: User | None
    account: BuyerAccount | None

    @property
    def can_see_price(self) -> bool:
        # 19号 M1 开放参数默认：游客不可见价，注册可见（含未过审企业——浏览与下单分离）
        return self.user is not None

    @property
    def can_order(self) -> bool:
        return bool(self.account and self.account.can_order)


def resolve_buyer(request) -> Buyer:
    """从请求解析买家形态：JWT 有效→individual/corporate；否则 guest。"""
    try:
        user = JWTAuthentication().authenticate(request)[0]
    except (AuthenticationFailed, TypeError):
        # P3（except 收窄）：AuthenticationFailed=token 无效/过期（InvalidToken 基类）；
        # TypeError=匿名请求 authenticate 返回 None 取 [0]。其余异常（如 DB 故障）
        # 不再吞成游客——静默降级会掩盖故障
        return Buyer(kind="guest", user=None, account=None)
    account = getattr(user, "buyer_account", None)
    if account is None:  # 管理端账号误用买家端点 → 视为 guest（不带价）
        return Buyer(kind="guest", user=None, account=None)
    kind = (
        BuyerAccount.BuyerType.CORPORATE
        if account.buyer_type == BuyerAccount.BuyerType.CORPORATE
        else "individual"
    )
    return Buyer(kind=kind, user=user, account=account)


def register_buyer(
    *,
    username: str,
    password: str,
    phone: str = "",
    buyer_type: str,
    company_name_ru: str = "",
    inn: str = "",
) -> BuyerAccount:
    """F-01 注册：个人即 approved；企业落 pending 等管理端审核（F-15）。"""
    from django.db import transaction

    with transaction.atomic():
        user = User.objects.create_user(username=username, password=password)
        account = BuyerAccount.objects.create(
            user=user,
            buyer_type=buyer_type,
            phone=phone,
            company_name_ru=company_name_ru,
            inn=inn,
            # verification_status 缺省 pending；individual 由 save() 置 approved
        )
    return account
