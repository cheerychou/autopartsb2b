#!/usr/bin/env bash
# B1-RU 禁止模式检查（机器可执行子集；完整清单见根 CLAUDE.md 代码规范检查清单）
# 来源: 承 CDD3 scripts/ci/check-banned-patterns.sh 模式重写（copy-ledger 登记）
set -uo pipefail

FAIL=0

check() {
  local pattern="$1" message="$2"
  # 只检查代码文件，排除本脚本/文档/生成物/packages 内部实现（b1-* 包的 components/ui 是包源码，非应用内分发产物）
  local hits
  hits=$(grep -rInE --include='*.py' --include='*.ts' --include='*.tsx' \
    --exclude-dir={node_modules,venv,generated,dist,.zcode} \
    "$pattern" backend/ frontend/storefront-web/ frontend/admin-web/ 2>/dev/null \
    | grep -v "check-banned-patterns" | grep -v "noqa: b1" || true)
  if [ -n "$hits" ]; then
    echo "🚫 禁止模式: $message"
    echo "$hits" | head -10
    FAIL=1
  fi
}

# 后端
check 'permission_classes\s*=\s*\[\s*IsAuthenticated' "禁止 IsAuthenticated 裸用 → [RoleBasedPermission] + ACTION_PERMISSIONS"
check 'is_staff|is_superuser' "禁止 is_staff/is_superuser 业务判断 → has_role()/has_permission()（Django admin 代码除外请用 noqa 注释）"
check 'from shared\.user_management' "该模块在 CDD3 已删除，用 shared/permissions"
# 前端
check "localStorage\.setItem\('auth_token'" "禁止裸 localStorage 存 token → authStorage.setToken()"
check 'camelizeKeys|snakeizeKeys' "禁止业务代码手工大小写转换 → b1-shared-http 边界"
check 'lucide-react' "禁止 lucide-react → @phosphor-icons/react（Icons 注册表）"
check 'from ["'\'']radix' "禁止 radix → Base UI（b1-atoms 唯一源）"
check 'components/ui/[a-z-]+' "禁止直接改应用内原子组件 → b1-atoms 唯一源（如为分发产物请登记 allowlist）"

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "存在禁止模式，修复后重试（清单见根 CLAUDE.md）。如确认属例外，在本脚本登记豁免并附理由。"
  exit 1
fi
echo "✅ 禁止模式检查通过"
