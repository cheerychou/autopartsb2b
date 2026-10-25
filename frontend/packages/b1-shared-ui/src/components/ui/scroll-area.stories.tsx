/* eslint-disable cdd/no-l3-palette */
import type { Meta, StoryObj } from '@storybook/react'
import { ScrollArea } from './scroll-area'

const meta: Meta<typeof ScrollArea> = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    className: {
      control: 'text',
      description: '自定义类名',
    },
  },
}

export default meta
type Story = StoryObj<typeof ScrollArea>

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
      <div className="space-y-4">
        <p>这是第一段内容</p>
        <p>这是第二段内容</p>
        <p>这是第三段内容</p>
        <p>这是第四段内容</p>
        <p>这是第五段内容</p>
        <p>这是第六段内容</p>
        <p>这是第七段内容</p>
        <p>这是第八段内容</p>
      </div>
    </ScrollArea>
  ),
}

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-[300px] w-[400px] rounded-md border p-4">
      <div className="space-y-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="p-2 bg-muted rounded">
            列表项 {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="h-[100px] w-[400px] rounded-md border p-4">
      <div className="flex gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-32 h-20 bg-muted rounded flex items-center justify-center">
            项目 {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const LongList: Story = {
  render: () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      title: `项目 ${i + 1}`,
      description: `这是第 ${i + 1} 个项目的描述信息`,
    }))

    return (
      <ScrollArea className="h-[400px] w-full max-w-md rounded-md border">
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  },
}

export const CodeBlock: Story = {
  render: () => {
    const code = `
      function hello() {
        console.log('Hello, World!');
        return 'Hello, World!';
      }
      
      // 这是一个很长的代码块
      // 用于演示滚动效果
      // ...
    `

    return (
      <ScrollArea className="h-[300px] w-full max-w-lg rounded-md border bg-slate-900 p-4">
        <pre className="text-sm text-muted-foreground">
          <code>{code}</code>
        </pre>
      </ScrollArea>
    )
  },
}

export const LogViewer: Story = {
  render: () => {
    const logs = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
      level: i % 3 === 0 ? 'error' : i % 2 === 0 ? 'warn' : 'info',
      message: `日志消息 ${i + 1} - 系统运行正常`,
    }))

    return (
      <ScrollArea className="h-[400px] w-full max-w-lg rounded-md border bg-slate-950 p-4">
        <div className="space-y-1 font-mono text-sm">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4">
              <span className="text-muted-foreground shrink-0">[{log.time}]</span>
              <span className={`
                shrink-0 font-bold
                ${log.level === 'error' ? 'text-destructive' : ''}
                ${log.level === 'warn' ? 'text-warning' : ''}
                ${log.level === 'info' ? 'text-primary' : ''}
              `}>
                {log.level.toUpperCase()}
              </span>
              <span className="text-muted-foreground">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  },
}

export const ImageGallery: Story = {
  render: () => (
    <ScrollArea className="h-[300px] w-full max-w-2xl rounded-md border p-4">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">图片 {i + 1}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const TableScroll: Story = {
  render: () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      name: `用户 ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: i % 3 === 0 ? '管理员' : i % 2 === 0 ? '编辑' : '用户',
    }))

    return (
      <ScrollArea className="h-[300px] w-full max-w-2xl rounded-md border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">姓名</th>
              <th className="p-2 text-left">邮箱</th>
              <th className="p-2 text-left">角色</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/50">
                <td className="p-2">{row.id}</td>
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.email}</td>
                <td className="p-2">{row.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    )
  },
}

export const ChatMessages: Story = {
  render: () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      user: i % 2 === 0 ? '我' : '对方',
      content: `这是第 ${i + 1} 条消息内容`,
      time: new Date(Date.now() - i * 300000).toLocaleTimeString(),
    }))

    return (
      <ScrollArea className="h-[400px] w-full max-w-lg rounded-md border p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user === '我' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`
                max-w-[70%] rounded-lg p-3
                ${message.user === '我' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
                }
              `}>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">{message.time}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  },
}

export const FileList: Story = {
  render: () => {
    const files = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      name: `document-${i + 1}.pdf`,
      size: `${(i + 1) * 1024} KB`,
      date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
    }))

    return (
      <ScrollArea className="h-[350px] w-full max-w-lg rounded-md border">
        <div className="divide-y">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-destructive-soft rounded flex items-center justify-center text-destructive">
                  📄
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{file.date}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  },
}
