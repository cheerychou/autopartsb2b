import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
import { Button } from './button'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card style={{ width: 400 }}>
      <CardHeader>
        <CardTitle>客户信息</CardTitle>
        <CardDescription>查看和编辑客户基本资料</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          姓名：张三<br />
          手机：138****8888<br />
          车牌：京A12345
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline">取消</Button>
        <Button>保存</Button>
      </CardFooter>
    </Card>
  ),
}

export const SimpleCard: Story = {
  render: () => (
    <Card style={{ width: 300, padding: 'var(--radius-lg)' }}>
      <CardHeader>
        <CardTitle>统计概览</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">1,234</div>
        <div className="text-sm text-muted-foreground">本月工单数</div>
      </CardContent>
    </Card>
  ),
}
