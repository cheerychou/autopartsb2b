import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
    badgeSize: {
      control: 'select',
      options: ['sm', 'default'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = { args: { children: '进行中' } }
export const Secondary: Story = { args: { children: '草稿', variant: 'secondary' } }
export const Destructive: Story = { args: { children: '已取消', variant: 'destructive' } }
export const Outline: Story = { args: { children: '标签', variant: 'outline' } }
export const SizeSM: Story = { args: { children: '紧凑', badgeSize: 'sm' } }
