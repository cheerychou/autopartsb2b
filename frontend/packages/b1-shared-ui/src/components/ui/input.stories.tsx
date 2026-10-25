import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    inputSize: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = { args: { placeholder: '请输入内容' } }
export const SizeSM: Story = { args: { placeholder: '小尺寸 32px', inputSize: 'sm' } }
export const SizeLG: Story = { args: { placeholder: '大尺寸 40px', inputSize: 'lg' } }
export const Disabled: Story = { args: { placeholder: '已禁用', disabled: true } }
export const WithValue: Story = { args: { value: '张三', placeholder: '请输入姓名' } }
