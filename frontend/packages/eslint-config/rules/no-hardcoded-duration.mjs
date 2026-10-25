/**
 * no-hardcoded-duration —— 禁止在 className 中硬编码 Tailwind duration 数值类
 *
 * Motion Token 体系（DSGN 系列）已落地：theme-bindings.css 通过 @utility 提供
 * duration-fast / duration-normal / duration-slow（引用 --motion-duration-* token），
 * easing 由 @theme --ease-* 提供 ease-standard / ease-enter / ease-exit。
 *
 * 本规则拦截 `duration-150` / `duration-200` / `duration-300` 等数值写法，
 * 防止新代码绕过 token 体系回退到硬编码（2026-09 存量 76 处已一次性迁移归零）。
 *
 * 检测范围：className / class 属性中的
 * - 纯字面量字符串：className="duration-200"
 * - 模板字符串的字面量片段：className={`p-4 ${c ? 'duration-200' : ''}`}
 * - cn()/clsx() 调用的字面量参数：cn('duration-300', className)
 * 只扫描 Literal 字符串（静态可判定），变量插值不在此规则范围（由
 * no-dynamic-classname 规则拦截运行时拼接）。
 *
 * @example 报错
 *   <div className="transition duration-200" />
 *   <div className={cn('p-4', 'duration-300')} />
 * @example 放行
 *   <div className="transition duration-normal" />
 *   <div className="data-closed:duration-slow" />
 */

/** duration 数值类的正则：匹配 duration-<数字>（含变体前缀 data-closed: 等） */
const DURATION_NUMERIC = /(^|\s|:|"|')(?:[a-z-]+:)*duration-\d+(?=\s|"|'|$)/

/**
 * 判断一个字符串字面量是否包含裸 duration-<number> 类
 * @param {string} value
 * @returns {boolean}
 */
function hasHardcodedDuration(value) {
  return DURATION_NUMERIC.test(value)
}

/**
 * 从字符串字面量中提取首个命中的裸 duration 类名（用于报错信息定位）
 * @param {string} value
 * @returns {string | null}
 */
function extractMatch(value) {
  const m = value.match(/(?:[a-z-]+:)*duration-\d+/)
  return m ? m[0] : null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        '禁止在 className 中硬编码 duration-<number> 数值类。请使用 Motion Token 语义类：duration-fast(150ms) / duration-normal(200ms) / duration-slow(300ms)；easing 用 ease-standard / ease-enter / ease-exit。',
    },
    schema: [],
  },

  create(context) {
    /**
     * 检查单个字符串字面量节点（Literal / TemplateLiteral 的 quasis 静态片段）
     * @param {import('estree').Node} node
     * @param {string} value
     */
    function checkString(node, value) {
      if (typeof value !== 'string' || !hasHardcodedDuration(value)) return
      const hit = extractMatch(value)
      context.report({
        node,
        message:
          '禁止硬编码 {{hit}}。请使用 Motion Token 语义类：duration-fast / duration-normal / duration-slow' +
          '（值由 --motion-duration-* token 统一管理，详见 shared-ui theme-bindings.css）。',
        data: { hit: hit || 'duration-<number>' },
      })
    }

    /**
     * 递归扫描表达式树中的字符串字面量（限静态可判定形态）
     * 覆盖：Literal、TemplateLiteral（quasis + 三元/逻辑分支内的 Literal）、
     * CallExpression（cn/clsx 参数）、ConditionalExpression / LogicalExpression 分支。
     * 变量引用（Identifier/MemberExpression）不展开——运行时拼接由
     * no-dynamic-classname 规则负责。
     * @param {import('estree').Node} expr
     */
    function scanExprTree(expr) {
      if (!expr) return

      switch (expr.type) {
        case 'Literal':
          checkString(expr, expr.value)
          break
        case 'TemplateLiteral':
          for (const quasi of expr.quasis) {
            checkString(quasi, quasi.value.raw)
          }
          for (const sub of expr.expressions) {
            scanExprTree(sub)
          }
          break
        case 'CallExpression':
          for (const arg of expr.arguments) {
            scanExprTree(arg)
          }
          break
        case 'ConditionalExpression':
          scanExprTree(expr.consequent)
          scanExprTree(expr.alternate)
          break
        case 'LogicalExpression':
          scanExprTree(expr.left)
          scanExprTree(expr.right)
          break
        default:
          break
      }
    }

    return {
      /**
       * 处理 JSX 属性节点（className / class）
       * 覆盖三种形态：纯字面量、模板字符串、cn()/clsx() 调用及其表达式树
       */
      JSXAttribute(node) {
        const name = node.name?.name
        if (name !== 'className' && name !== 'class') return

        const value = node.value
        if (!value) return

        // 形态1：className="..." 纯字面量
        if (value.type === 'Literal') {
          checkString(value, value.value)
          return
        }

        if (value.type !== 'JSXExpressionContainer') return
        const expr = value.expression

        // 形态2：className={`...`} 模板字符串
        if (expr.type === 'TemplateLiteral') {
          for (const quasi of expr.quasis) {
            checkString(quasi, quasi.value.raw)
          }
          for (const sub of expr.expressions) {
            scanExprTree(sub)
          }
          return
        }

        // 形态3：className={cn('...', ...)} 调用及其表达式树
        scanExprTree(expr)
      },
    }
  },
}
