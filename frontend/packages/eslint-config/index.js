/**
 * @cdd/eslint-config — React app 主预设
 *
 * 统一基础规则集（MNT-006 §2.4），3 个 React app（store-web/platform-web/
 * data-platform-web）共用。含 react-hooks/react-refresh 预设 + TS 基础质量规则 +
 * cdd/no-direct-phosphor-icons（3 app 都在用）。
 *
 * 各 app 的 store-web 专属业务规则（cdd/no-l3-palette、no-restricted-imports、
 * 三态防回退）保留在 app 本地 override。
 *
 * 用法（app 的 eslint.config.js）:
 *   import cddConfig from '@cdd/eslint-config'
 *   export default defineConfig([
 *     ...cddConfig({ tsconfigRootDir: import.meta.dirname, tsconfig: ['./tsconfig.app.json'] }),
 *     // app 私有 override 在此追加
 *   ])
 */

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import noDirectPhosphorIcons from '../../../scripts/icon-registry/no-direct-phosphor-icons.mjs'
import noDynamicClassname from './rules/no-dynamic-classname.mjs'
import noHardcodedDuration from './rules/no-hardcoded-duration.mjs'
import noRadixImports from './rules/no-radix-imports.mjs'

/**
 * cdd 自定义规则插件（跨 app 共享部分）
 * no-l3-palette / no-restricted-imports / 三态防回退 保留在各 app 本地
 */
const cddSharedPlugin = {
  rules: {
    'no-direct-phosphor-icons': noDirectPhosphorIcons,
    'no-dynamic-classname': noDynamicClassname,
    'no-hardcoded-duration': noHardcodedDuration,
    'no-radix-imports': noRadixImports,
  },
}

/**
 * 生成 React app 的 eslint 配置数组
 * @param {{ tsconfigRootDir: string, tsconfig?: string[] }} opts
 * @returns {Array} eslint flat config 数组
 */
export function reactApp(opts = {}) {
  if (!opts.tsconfigRootDir) {
    throw new Error('@cdd/eslint-config reactApp(): 必须传入 tsconfigRootDir（app 自己的目录，如 import.meta.dirname）')
  }
  const tsconfigRootDir = opts.tsconfigRootDir
  const tsconfig = opts.tsconfig || ['./tsconfig.app.json']

  return [
    {
      files: ['src/**/*.{ts,tsx}'],
      ignores: [
        'src/test/**',
        'src/__tests__/**',
        '**/*.stories.ts',
        '**/*.stories.tsx',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/generated/**',
      ],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        reactHooks.configs.flat['recommended-latest'],
      ],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        parserOptions: { project: tsconfig, tsconfigRootDir },
      },
      plugins: {
        'react-refresh': reactRefresh,
        cdd: cddSharedPlugin,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-debugger': 'error',
        'no-unused-vars': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'react-refresh/only-export-components': 'warn',
        // react-hooks 7.x 新增的激进规则：保留检查可见性但降为 warn，
        // 避免升级（5.x→7.x）引入大量 error 破坏 CI；后续逐步收紧
        'react-hooks/set-state-in-effect': 'warn',
        'react-hooks/purity': 'warn',
        'react-hooks/preserve-manual-memoization': 'warn',
        'react-hooks/immutability': 'warn',
        'react-hooks/static-components': 'warn',
        'react-hooks/refs': 'warn',
        'react-hooks/use-memo': 'warn',
        'react-hooks/void-use-memo': 'warn',
        'react-hooks/component-hook-factories': 'warn',
        'react-hooks/error-boundaries': 'warn',
        'react-hooks/set-state-in-render': 'warn',
        'react-hooks/unsupported-syntax': 'warn',
        'react-hooks/gating': 'warn',
        'react-hooks/globals': 'warn',
        'react-hooks/incompatible-library': 'warn',
        'react-hooks/config': 'warn',
        // 图标治理（3 app 共享）：禁止直导已有语义别名的 Phosphor 图标
        'cdd/no-direct-phosphor-icons': 'warn',
        // 防动态拼接类名（Tailwind v4 静态扫描要求）：见 cdd/no-dynamic-classname
        //   规则2 由本自定义规则覆盖（warn：现存约 70 处灰区写法，渐进迁移）
        'cdd/no-dynamic-classname': 'warn',
        // Motion Token 防回退：禁止裸 duration-<number>（存量已迁移归零，error 防新代码回退）
        'cdd/no-hardcoded-duration': 'error',
        // Radix → Base UI 迁移已完成（ENG-DEV-IMPL-014 P5 固化）：radix import 全仓归零，
        // error 防回退（cdd-website 官网不参与迁移，规则在其 lint 范围外）。
        'cdd/no-radix-imports': 'error',
        // 防动态拼接类名 — 规则1：禁 className 内运行时字符串变换（.replace/.split 等）
        //   现存零命中，纯预防，设 error。注意：本数组会被 app 本地的同 key 规则整体覆盖
        //   （flat config 同名 rule 后块生效），store-web 等有本地 no-restricted-syntax
        //   override 的 app 需在其本地数组内追加本条 selector，否则此处对其失效。
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "JSXAttribute[name.name=/^(className|class)$/] JSXExpressionContainer CallExpression[callee.type='MemberExpression'][callee.property.name=/^(replace|split|substring|substr|toLowerCase|toUpperCase|trim|match)$/]",
            message:
              '禁止在 className 内对类名做运行时字符串变换（.replace/.split 等）。Tailwind v4 编译期按源码字面量扫描，运行时变换产生的类名不会进入构建产物，生产环境样式失效。如需动态样式，请在多个完整类名字面量间选择，或经前端白名单映射。',
          },
        ],
        // 图标库统一：禁止 lucide-react（统一用 @phosphor-icons/react，详见 DSGN-035 §1）
        // cdd-website（官网，lucide）与 store-mobile-app（lucide-react-native）不复用本预设，天然不受约束
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'lucide-react',
                message:
                  'CDD 统一使用 @phosphor-icons/react，禁止 lucide-react（详见 docs/development/design-system/ENG-DEV-DSGN-035 §1）。shadcn add 生成的组件请将图标 import 替换为 phosphor。',
              },
            ],
          },
        ],
      },
    },
    // 测试/配置/stories 文件块（无 project，避免被 tsconfig.app.json exclude 的文件解析失败）
    {
      files: [
        'src/test/**/*.{ts,tsx}',
        'src/**/__tests__/**/*.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'vitest.config.ts',
        'vite.config.ts',
      ],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
      },
      plugins: { 'react-refresh': reactRefresh },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'react-refresh/only-export-components': 'warn',
      },
    },
  ]
}

export default reactApp
