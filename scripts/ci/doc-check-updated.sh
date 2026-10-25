#!/usr/bin/env bash
# 文档 updated_at 检查：内容变更时 updated_at 必须同步（制品层）
# 来源: 承 CDD3 FND-GOV-003 裁剪
set -uo pipefail
FAIL=0
for f in $(git diff --cached --name-only --diff-filter=M -- 'docs/engineering/*.md' 'docs/knowledge/*.md' 2>/dev/null); do
  [ -f "$f" ] || continue
  # 若正文有非 frontmatter 变更而 frontmatter 未动，提示（不做强校验，避免误报）
  if git diff --cached "$f" | grep -qE '^[+-][^+-]' && ! git diff --cached "$f" | grep -qE '^[+-]updated_at:'; then
    echo "⚠️  $f 内容已变更但 updated_at 未更新（建议同步）"
  fi
done
echo "✅ 文档日期检查完成"
