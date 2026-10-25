import type { Meta, StoryObj } from '@storybook/react'
import { z } from 'zod'
import { Form } from './form'
import { FormField } from './form-field'
import { FormFooter } from './form-footer'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

const meta: Meta<typeof Form> = {
  title: 'Form/FormPage',
  component: Form,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof Form>

// 校验 schema
const customerSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  plate: z.string().optional(),
})

export const CustomerForm: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <Form
        schema={customerSchema}
        defaultValues={{ name: '', phone: '', plate: '' }}
        onSubmit={(data) => alert(JSON.stringify(data, null, 2))}
      >
        {/* 基本信息区块 */}
        <div style={{
          border: '1px solid var(--color-semantic-saas-border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            <Badge variant="secondary" style={{ marginRight: 8 }}>1</Badge>
            基本信息
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField name="name" label="客户姓名" required>
              <Input placeholder="请输入姓名" />
            </FormField>
            <FormField name="phone" label="手机号" required description="用于接收服务通知">
              <Input placeholder="请输入手机号" />
            </FormField>
          </div>
        </div>

        {/* 车辆信息区块 */}
        <div style={{
          border: '1px solid var(--color-semantic-saas-border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          marginTop: 24,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            <Badge variant="secondary" style={{ marginRight: 8 }}>2</Badge>
            车辆信息
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <FormField name="plate" label="车牌号" description="选填">
              <Input placeholder="请输入车牌号" />
            </FormField>
          </div>
        </div>

        <FormFooter
          left={<Button variant="outline" type="button">取消</Button>}
        >
          <Button type="submit">保存客户信息</Button>
        </FormFooter>
      </Form>
    </div>
  ),
}

// 简单表单（无 section）
const simpleSchema = z.object({
  keyword: z.string().min(1, '关键词不能为空'),
})

export const SimpleForm: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <Form
        schema={simpleSchema}
        defaultValues={{ keyword: '' }}
        onSubmit={(data) => alert(JSON.stringify(data, null, 2))}
      >
        <FormField name="keyword" label="搜索关键词" required>
          <Input placeholder="请输入" />
        </FormField>
        <FormFooter>
          <Button type="submit">搜索</Button>
        </FormFooter>
      </Form>
    </div>
  ),
}
