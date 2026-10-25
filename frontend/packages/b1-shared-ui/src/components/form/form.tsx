import * as React from "react"
import { useForm, FormProvider as FormProviderContext, useFormContext } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { UseFormReturn, FieldValues, DefaultValues, SubmitHandler, UseFormProps } from "react-hook-form"
import type { ZodType } from "zod"
import { cn } from "cn"

export interface FormProps<T extends FieldValues = FieldValues> extends UseFormProps<T> {
  children: React.ReactNode
  className?: string
  onSubmit: SubmitHandler<T>
  /** zod 校验 schema，传入后自动启用 schema 校验 */
  schema?: ZodType<T>
}

/**
 * 统一表单容器组件
 *
 * 基于 react-hook-form FormProvider，整合：
 * - zod schema 校验（传入 schema prop 即可）
 * - FormSection 嵌套支持（通过 FormSection 组件）
 * - 统一字段间距（space-y-6）
 *
 * @example
 *   const schema = z.object({
 *     name: z.string().min(1, '姓名不能为空'),
 *     phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不对'),
 *   })
 *
 *   <Form schema={schema} onSubmit={handleSubmit} defaultValues={{ name: '', phone: '' }}>
 *     <FormSection title="基本信息" columns={4}>
 *       <FormField name="name" label="姓名" required>
 *         <Input />
 *       </FormField>
 *       <FormField name="phone" label="手机号">
 *         <PhoneInput />
 *       </FormField>
 *     </FormSection>
 *     <FormFooter>
 *       <Button type="submit">保存</Button>
 *     </FormFooter>
 *   </Form>
 */
export function Form<T extends FieldValues = FieldValues>({
  children,
  className,
  onSubmit,
  schema,
  ...formProps
}: FormProps<T>) {
  const methods = useForm<T>({
    ...formProps,
    ...(schema ? { resolver: zodResolver(schema as any) } : {}),
  })

  return (
    <FormProviderContext {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={cn("space-y-form", className)}>
        {children}
      </form>
    </FormProviderContext>
  )
}

export {
  useForm,
  useFormContext,
  type UseFormReturn,
  type FieldValues,
  type DefaultValues,
  type SubmitHandler,
  type UseFormProps,
  zodResolver,
}
