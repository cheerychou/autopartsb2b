import type { Meta, StoryObj } from '@storybook/react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from './table'

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
  argTypes: {
    density: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Table>

const sampleData = [
  { id: 1, name: '张三', plate: '京A12345', service: '更换机油', status: '进行中' },
  { id: 2, name: '李四', plate: '沪B67890', service: '刹车片更换', status: '已完成' },
  { id: 3, name: '王五', plate: '粤C54321', service: '四轮定位', status: '待派工' },
]

export const Default: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHeader>
        <TableRow>
          <TableHead>客户</TableHead>
          <TableHead>车牌</TableHead>
          <TableHead>服务项目</TableHead>
          <TableHead>状态</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleData.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell className="font-mono">{row.plate}</TableCell>
            <TableCell>{row.service}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  args: { density: 'default' },
}

export const Compact: Story = {
  ...Default,
  args: { density: 'compact' },
}

export const Comfortable: Story = {
  ...Default,
  args: { density: 'comfortable' },
}

export const WithFooter: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHeader>
        <TableRow>
          <TableHead>项目</TableHead>
          <TableHead className="text-right">金额</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[{ item: '更换机油', amount: '¥380.00' }, { item: '机滤', amount: '¥45.00' }].map((row, i) => (
          <TableRow key={i}>
            <TableCell>{row.item}</TableCell>
            <TableCell className="text-right font-mono">{row.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>合计</TableCell>
          <TableCell className="text-right font-bold">¥425.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
  args: { density: 'default' },
}
