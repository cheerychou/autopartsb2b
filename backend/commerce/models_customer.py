"""commerce 客户模型（F-15 客户管理 + 买家三形态，31号§五🟢委托方修正）。

商城端三种角色（不进管理端 RBAC，独立买家认证）：
- guest 游客：匿名浏览（不落库——无账号即游客）；
- buyer_individual 个人客户：注册即用；
- buyer_corporate 企业客户：注册后须经管理端审核（本模型的 verification_status
  状态流：pending→approved/rejected），通过前可浏览不可下单。

审核动作是管理端动作回写买家账号状态（不是买家自助升级）——rejected 可复核（回 pending）。
"""

from django.contrib.auth.models import User
from django.db import models


class BuyerAccount(models.Model):
    """买家账号：一对一挂 Django User（买家认证 JWT 双形态 S3 接入）。"""

    class BuyerType(models.TextChoices):
        INDIVIDUAL = "individual", "个人客户"
        CORPORATE = "corporate", "企业客户"

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "待审核"
        APPROVED = "approved", "已认证"
        REJECTED = "rejected", "已驳回"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="buyer_account")
    buyer_type = models.CharField(max_length=10, choices=BuyerType.choices)
    phone = models.CharField(max_length=20, blank=True, default="", verbose_name="手机")

    # 企业客户专属资料（审核材料）
    company_name_ru = models.CharField(
        max_length=300, blank=True, default="", verbose_name="企业名称(俄)"
    )
    inn = models.CharField(
        max_length=12, blank=True, default="", verbose_name="ИНН", help_text="俄企税号"
    )
    verification_status = models.CharField(
        max_length=8,
        choices=VerificationStatus.choices,
        default="pending",
        verbose_name="认证状态",
        help_text="仅 corporate 有效；individual 恒 approved",
    )
    verification_note = models.CharField(
        max_length=200, blank=True, default="", verbose_name="审核意见"
    )
    verified_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="corporate_verifications",
        verbose_name="审核人",
    )
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name="审核时间")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "commerce_buyer_account"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # 个人客户无审核流（注册即用，31号§五）
        if self.buyer_type == self.BuyerType.INDIVIDUAL:
            self.verification_status = self.VerificationStatus.APPROVED
        super().save(*args, **kwargs)

    @property
    def can_order(self) -> bool:
        """下单资格：个人=恒可；企业=过审才可（F-15 前台门控依据）。"""
        if self.buyer_type == self.BuyerType.INDIVIDUAL:
            return True
        return self.verification_status == self.VerificationStatus.APPROVED

    def __str__(self):
        return f"{self.get_buyer_type_display()}:{self.user.username}[{self.verification_status}]"
