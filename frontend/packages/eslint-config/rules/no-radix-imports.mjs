/**
 * no-radix-imports —— 禁止 radix-ui import（ENG-DEV-IMPL-014 P0 建立，P5 固化）
 *
 * 项目已完成从 Radix 底座到 Base UI（@base-ui/react）的迁移
 * （P0~P4，radix import 全仓归零）。本规则升 error 固化，防止回退。
 * 例外：cdd-website（Next.js 官网）不参与迁移，规则在其 lint 范围外。
 *
 * 命中：import ... from 'radix-ui' / '@radix-ui/react-*' 与动态 import()。
 * 放行：@base-ui/*、其他包。
 */
const RADIX_SOURCE_RE = /^(radix-ui|@radix-ui\/)/;

function checkSource(node, context) {
  const source = node.source && node.source.value;
  if (typeof source !== 'string') return;
  if (RADIX_SOURCE_RE.test(source)) {
    context.report({
      node,
      message:
        '禁止 radix 底座 import（{{source}}）：原子组件一律使用 @base-ui/react（Base UI 底座），见 ENG-DEV-IMPL-014。链接形态组合用 buttonVariants/render prop，勿引入 Slot。',
      data: { source },
    });
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Radix → Base UI 迁移期（ENG-DEV-IMPL-014）：禁止新增 radix-ui import',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration: (node) => checkSource(node, context),
      ImportExpression: (node) => checkSource(node, context),
      'CallExpression[callee.type="ImportExpression"]': (node) => checkSource(node, context),
    };
  },
};
