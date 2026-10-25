import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import { FloppyDisk, Plus } from '@phosphor-icons/react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['xs', 'default', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

// ---- 变体 ----
export const Default: Story = { args: { children: '默认按钮' } }
export const Secondary: Story = { args: { children: '次要按钮', variant: 'secondary' } }
export const Destructive: Story = { args: { children: '删除', variant: 'destructive' } }
export const Outline: Story = { args: { children: '轮廓按钮', variant: 'outline' } }
export const Ghost: Story = { args: { children: '幽灵按钮', variant: 'ghost' } }
export const Link: Story = { args: { children: '链接按钮', variant: 'link' } }

// ---- 尺寸 ----
export const SizeXS: Story = { args: { children: '极小按钮', size: 'xs' } }
export const SizeDefault: Story = { args: { children: '默认尺寸 32px' } }
export const SizeMD: Story = { args: { children: '中等尺寸 36px', size: 'md' } }
export const SizeLG: Story = { args: { children: '大按钮 40px', size: 'lg' } }

// ---- 状态 ----
export const Loading: Story = { args: { children: '保存中', loading: true } }
export const Disabled: Story = { args: { children: '已禁用', disabled: true } }

// ---- 带图标 ----
export const WithIcon: Story = {
  args: { children: '保存', leftIcon: <FloppyDisk size={16} /> },
}
export const IconOnly: Story = {
  args: { size: 'icon', children: <Plus size={16} />, 'aria-label': '新建' },
}
