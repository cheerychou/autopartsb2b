import * as React from "react"
import { useController, useFormContext, type ControllerFieldState, type UseControllerReturn } from "react-hook-form"
import { cn } from "cn"
import { FormLabel } from "./form-label"
import { FormMessage } from "./form-message"

export interface FormFieldProps {
  name: string
  label?: string
  required?: boolean
  description?: string
  /** 是否禁用（用于只读/查看模式，注入到子组件 disabled prop） */
  disabled?: boolean
  children: React.ReactElement
  className?: string
}

/**
 * 表单字段组件（统一版）
 *
 * 封装 react-hook-form useController，自动注入：
 * - field props（value / onChange / onBlur / ref）到子组件
 * - aria-invalid / error 等状态属性
 * - FormLabel（自动带必填标记）
 * - FormMessage（校验错误自动展示）
 * - description（字段说明文字）
 *
 * 子组件接收注入的 props 后直接渲染，无需手动处理 fieldState。
 *
 * @example
 *   <FormField name="customerName" label="客户姓名" required>
 *     <Input />
 *   </FormField>
 *
 *   <FormField name="remark" label="备注">
 *     <Textarea />
 *   </FormField>
 */
export function FormField({
  name,
  label,
  required,
  description,
  disabled,
  children,
  className,
}: FormFieldProps) {
  const { control } = useFormContext()
  const { field, fieldState } = useController({ name, control })

  // 将 field props 注入到子组件
  const childProps = children.props as Record<string, unknown>;

  // 统一 change 处理：兼容三类子组件接口
  // - Input/Textarea（原生 onChange: event）
  // - InputNumber（onChange: number | undefined）
  // - Select（onValueChange: value）
  const handleChange = (value: unknown) => {
    let v: unknown = value
    // 原生 input 事件：提取 target.value
    if (value && typeof value === 'object' && 'target' in value) {
      v = (value as { target: { value: unknown } }).target.value
    }
    field.onChange(v)
    const userOnChange = childProps.onChange as ((value: unknown) => void) | undefined
    userOnChange?.(value)
  }

  const injected = React.cloneElement(children, {
    ...childProps,
    // 值：保留原类型（number/string），不做强制 string 转换
    value: field.value ?? childProps.value ?? '',
    // 统一注入 onChange（Select 内部已将 onChange 映射为 onValueChange，见 select.tsx）
    onChange: handleChange,
    // disabled 注入（FormField 显式 prop 优先于子组件自身）
    disabled: disabled ?? childProps.disabled,
    // 传递错误状态
    'aria-invalid': fieldState.invalid ? true : undefined,
  } as any)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <FormLabel required={required}>
          {label}
        </FormLabel>
      )}
      {injected}
      {fieldState.error && (
        <FormMessage error={fieldState.error.message} />
      )}
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

// ===== 向后兼容：旧版 render-prop API =====

export interface FormFieldLegacyProps {
  name: string
  label?: string
  required?: boolean
  description?: string
  children: (field: UseControllerReturn['field'], fieldState: ControllerFieldState) => React.ReactNode
  className?: string
}

/**
 * FormFieldLegacy（旧版 render-prop API）
 *
 * @deprecated 新代码请使用 FormField（children 版）
 * 此组件仅为兼容存量页面保留，不会移除。
 */
export function FormFieldLegacy({
  name,
  label,
  required,
  description,
  children,
  className,
}: FormFieldLegacyProps) {
  const { control } = useFormContext()
  const { field, fieldState } = useController({ name, control })

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <FormLabel required={required}>
          {label}
        </FormLabel>
      )}
      {children(field, fieldState)}
      {fieldState.error && (
        <FormMessage error={fieldState.error.message} />
      )}
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
