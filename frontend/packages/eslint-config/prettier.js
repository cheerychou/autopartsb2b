/**
 * @cdd/eslint-config/prettier — 共享 Prettier 配置（MNT-006 §2.4）
 *
 * 此前整个 frontend 工作区零 prettier 配置（store-web 仅 format 脚本用全默认）。
 * 本配置匹配现有代码风格（单引号/分号/2 空格），避免 reformat 全仓。
 *
 * 用法（根 .prettierrc.cjs）:
 *   module.exports = require('@cdd/eslint-config/prettier')
 */
export default {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
}
