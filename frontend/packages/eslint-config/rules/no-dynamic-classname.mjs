/**
 * no-dynamic-classname —— 禁止在 className 模板字符串中拼接变量/对象属性/函数返回值
 *
 * Tailwind v4（Oxide）编译期按源码字面量扫描类名，运行时拼接产生的类名
 * （如 `grid-cols-${n}`、`bg-${item.color}`、`text-${size}`）不会进入构建产物，
 * dev 环境全量加载看不出来，生产构建后类名丢失、样式失效甚至白屏。
 *
 * 本规则只拦截「模板字面量 + 危险插值」组合。下列安全写法放行：
 * - 纯字面量：`className="text-sm"`
 * - cn()/clsx 调用：`className={cn('p-4', isActive && 'bg-primary')}`
 * - 模板字符串内「字面量三元选择」：`className={`text-sm ${c ? 'a' : 'b'}`}`
 *   （三元分支为 Literal 即安全，因为所有候选都是完整字面量，可被静态扫描）
 *
 * 下列危险写法报错：
 * - 插值变量：`className={`grid-cols-${tabCount}`}`
 * - 插值对象属性：`className={`text-${style.color}`}`
 * - 插值函数调用：`className={`bg-${getColor()}`}`
 * - 三元分支仍含危险插值：`className={`${c ? style.x : style.y}`}`
 *
 * 运行时字符串变换（.replace/.split 等）由配套的 no-restricted-syntax 规则覆盖，
 * 本规则不重复处理。
 *
 * @example 报错
 *   <div className={`grid-cols-${tabCount}`} />          // 插值 Identifier
 *   <div className={`text-${style.color}`} />            // 插值 MemberExpression
 *   <div className={`bg-${getColor()}`} />               // 插值 CallExpression
 * @example 放行
 *   <div className={`text-sm ${c ? 'a' : 'b'}`} />       // 三元分支为 Literal
 *   <div className={cn('p-4', className)} />             // cn() 调用不拦截
 *   <div className="text-sm" />                          // 纯字面量
 */

/**
 * 判断一个插值表达式是否为「危险形态」——即运行时才能确定值、无法静态扫描。
 * 三元/逻辑表达式会递归判断其子节点。
 * @param {import('estree').Node} expr
 * @returns {boolean}
 */
function isDangerous(expr) {
  if (!expr) return false

  switch (expr.type) {
    // 直接的字面量 → 静态可扫描，安全
    case 'Literal':
      return false

    // 变量 → 运行时取值，危险
    case 'Identifier':
      // 模板字面量里的 tagged template（如 sql`...`）极少出现在 className，忽略
      return true

    // 对象属性访问 a.b / a[b] → 运行时取值，危险
    case 'MemberExpression':
      return true

    // 函数调用 → 运行时取值，危险
    case 'CallExpression':
      return true

    // 三元 cond ? a : b → 递归判断两个分支；分支都是字面量才安全
    case 'ConditionalExpression':
      return isDangerous(expr.consequent) || isDangerous(expr.alternate)

    // 逻辑表达式 a || b / a && b → 递归判断
    case 'LogicalExpression':
      return isDangerous(expr.left) || isDangerous(expr.right)

    // 其余形态（赋值、序列、await 等）按危险处理，避免漏报
    default:
      return true
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        '禁止在 className 模板字符串中拼接变量/对象属性/函数返回值（Tailwind v4 编译期无法静态扫描，生产构建会丢失类名）。请改用完整类名字面量的三元选择，或经前端白名单映射。',
    },
    schema: [],
  },

  create(context) {
    return {
      /**
       * 处理 JSX 属性节点（className / class）
       * 仅当属性值是 JSXExpressionContainer 且内部为 TemplateLiteral 时介入
       */
      JSXAttribute(node) {
        const name = node.name?.name
        if (name !== 'className' && name !== 'class') return

        const value = node.value
        if (!value || value.type !== 'JSXExpressionContainer') return

        const expr = value.expression
        if (!expr || expr.type !== 'TemplateLiteral') return

        // 检查每个插值项；命中任意一个危险形态即报错
        for (const interpolation of expr.expressions) {
          if (isDangerous(interpolation)) {
            context.report({
              node: interpolation,
              message:
                '禁止在 className 模板字符串中拼接 {{type}}（`...${...}`）。' +
                'Tailwind v4 编译期按源码字面量扫描，运行时拼接产生的类名不会进入构建产物，生产环境样式失效。' +
                '请改用完整类名字面量的三元选择（如 `${c ? "text-a" : "text-b"}`），或经前端白名单映射到完整类名。',
              data: { type: describeExpr(interpolation) },
            })
            // 单个 className 只报一次，避免一个模板里多个危险插值刷屏
            break
          }
        }
      },
    }
  },
}

/** 生成插值形态的可读描述，用于报错信息 */
function describeExpr(expr) {
  switch (expr.type) {
    case 'Identifier':
      return `变量「${expr.name}」`
    case 'MemberExpression':
      return '对象属性'
    case 'CallExpression':
      return '函数返回值'
    default:
      return '运行时表达式'
  }
}
