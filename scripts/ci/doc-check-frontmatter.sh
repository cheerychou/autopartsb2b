#!/usr/bin/env bash
# 文档 frontmatter 检查（制品层：docs/engineering|knowledge 必须有 doc_id/title/updated_at frontmatter）
# 来源: 承 CDD3 FND-GOV-003 裁剪
set -uo pipefail
FAIL=0
for f in $(git diff --cached --name-only --diff-filter=ACM -- 'docs/engineering/*.md' 'docs/knowledge/*.md' 2>/dev/null); do
  [ -f "$f" ] || continue
  for field in doc_id title updated_at; do
    if ! head -10 "$f" | grep -qE "^${field}:"; then
      echo "🚫 $f 缺少 frontmatter 字段: $field"
      FAIL=1
    fi
  done
done
[ "$FAIL" -eq 0 ] && echo "✅ 文档 frontmatter 检查通过" || exit 1
