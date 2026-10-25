import type { Meta, StoryObj } from '@storybook/react'
import { Label } from './label'
import { Input } from './input'
import { Checkbox } from './checkbox'
import { RadioGroup, RadioGroupItem } from '../form/radio-group'
import { Switch } from '../form/switch'
import { Textarea } from '../form/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../form/select'
import { Envelope, Phone, Globe } from '@phosphor-icons/react'

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    htmlFor: {
      control: 'text',
      description: '关联的表单元素 ID',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
  },
}

export default meta
type Story = StoryObj<typeof Label>

export const Default: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">邮箱</Label>
      <Input
        type="email"
        id="email"
        placeholder="请输入邮箱地址"
      />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="disabled" disabled>
        禁用输入框
      </Label>
      <Input
        type="text"
        id="disabled"
        disabled
        placeholder="此输入框已禁用"
      />
    </div>
  ),
}

export const CustomStyle: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="name" className="text-lg font-bold">
          姓名
        </Label>
        <Input
          type="text"
          id="name"
          placeholder="请输入姓名"
        />
      </div>

      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="phone" className="text-primary">
          手机号
        </Label>
        <Input
          type="tel"
          id="phone"
          placeholder="请输入手机号"
        />
      </div>
    </div>
  ),
}

export const WithRequired: Story = {
  render: () => (
    <form className="space-y-6">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="username">
          用户名 <span className="text-destructive">*</span>
        </Label>
        <Input
          type="text"
          id="username"
          placeholder="请输入用户名"
          required
        />
      </div>

      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="password">
          密码 <span className="text-destructive">*</span>
        </Label>
        <Input
          type="password"
          id="password"
          placeholder="请输入密码"
          required
        />
      </div>

      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="confirm-password">
          确认密码 <span className="text-destructive">*</span>
        </Label>
        <Input
          type="password"
          id="confirm-password"
          placeholder="请再次输入密码"
          required
        />
      </div>
    </form>
  ),
}

export const WithCheckbox: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" />
        <Label htmlFor="terms" className="font-normal cursor-pointer">
          我已阅读并同意服务条款
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="newsletter" />
        <Label htmlFor="newsletter" className="font-normal cursor-pointer">
          订阅我们的新闻通讯
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="notifications" defaultChecked />
        <Label htmlFor="notifications" className="font-normal cursor-pointer">
          接收系统通知
        </Label>
      </div>
    </div>
  ),
}

export const WithRadio: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <RadioGroup defaultValue="option1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="option1" />
            <Label htmlFor="option1" className="font-normal cursor-pointer">
              选项一
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option2" id="option2" />
            <Label htmlFor="option2" className="font-normal cursor-pointer">
              选项二
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option3" id="option3" />
            <Label htmlFor="option3" className="font-normal cursor-pointer">
              选项三
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  ),
}

export const WithTextarea: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="message">
        留言 <span className="text-destructive">*</span>
      </Label>
      <Textarea
        id="message"
        placeholder="请输入您的留言"
        rows={5}
        required
      />
    </div>
  ),
}

export const WithSelect: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="country">
        国家/地区
      </Label>
      <Select>
        <SelectTrigger id="country">
          <SelectValue placeholder="请选择国家/地区" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cn">中国</SelectItem>
          <SelectItem value="us">美国</SelectItem>
          <SelectItem value="jp">日本</SelectItem>
          <SelectItem value="kr">韩国</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const WithSwitch: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="dark-mode">深色模式</Label>
        <Switch id="dark-mode" />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="notifications">通知</Label>
        <Switch id="notifications" defaultChecked />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="auto-save" disabled>
          自动保存
        </Label>
        <Switch id="auto-save" disabled />
      </div>
    </div>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Envelope className="h-4 w-4" />
          邮箱地址
        </Label>
        <Input
          type="email"
          id="email"
          placeholder="请输入邮箱地址"
        />
      </div>

      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          手机号码
        </Label>
        <Input
          type="tel"
          id="phone"
          placeholder="请输入手机号码"
        />
      </div>

      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="website" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          个人网站
        </Label>
        <Input
          type="url"
          id="website"
          placeholder="https://example.com"
        />
      </div>
    </div>
  ),
}

export const ResponsiveForm: Story = {
  render: () => (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="first-name">名</Label>
        <Input
          type="text"
          id="first-name"
          placeholder="请输入名"
        />
      </div>

      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="last-name">姓</Label>
        <Input
          type="text"
          id="last-name"
          placeholder="请输入姓"
        />
      </div>

      <div className="grid w-full items-center gap-1.5 md:col-span-2">
        <Label htmlFor="email">邮箱地址</Label>
        <Input
          type="email"
          id="email"
          placeholder="请输入邮箱地址"
        />
      </div>

      <div className="grid w-full items-center gap-1.5 md:col-span-2">
        <Label htmlFor="address">详细地址</Label>
        <Textarea
          id="address"
          placeholder="请输入详细地址"
          rows={3}
        />
      </div>
    </form>
  ),
}
