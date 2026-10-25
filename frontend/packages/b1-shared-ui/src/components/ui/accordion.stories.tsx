import type { Meta, StoryObj } from "@storybook/react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion"

const meta: Meta<typeof Accordion> = {
  title: "UI/Accordion",
  component: Accordion,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Accordion>

export const Default: Story = {
  render: () => (
    <Accordion className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>产品信息</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <p>
              我们的主打产品结合了尖端技术和时尚设计。采用优质材料制造，提供无与伦比的性能和可靠性。
            </p>
            <p>
              主要特点包括先进的处理能力，以及专为初学者和专家设计的直观用户界面。
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>配送详情</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <p>
              我们通过值得信赖的快递合作伙伴提供全球配送服务。标准配送需要 3-5 个工作日，而快速配送确保在 1-2 个工作日内送达。
            </p>
            <p>
              所有订单都经过精心包装并全额保险。您可以通过我们专门的跟踪门户实时跟踪您的货物。
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>退货政策</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <p>
              我们为产品提供全面的 30 天退货政策。如果您不完全满意，只需将商品以原始状态退回。
            </p>
            <p>
              我们的无忧退货流程包括免费退货运输，并在收到退货商品后 48 小时内处理全额退款。
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Multiple: Story = {
  render: () => (
    <Accordion multiple className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>常见问题 1</AccordionTrigger>
        <AccordionContent>
          <p>这是第一个常见问题的详细解答。您可以在这里找到关于该问题的所有信息。</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>常见问题 2</AccordionTrigger>
        <AccordionContent>
          <p>这是第二个常见问题的详细解答。您可以在这里找到关于该问题的所有信息。</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>常见问题 3</AccordionTrigger>
        <AccordionContent>
          <p>这是第三个常见问题的详细解答。您可以在这里找到关于该问题的所有信息。</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const WithDefaultValue: Story = {
  render: () => (
    <Accordion defaultValue="item-2" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>设置 1</AccordionTrigger>
        <AccordionContent>
          <p>这是设置选项 1 的详细说明。</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>设置 2</AccordionTrigger>
        <AccordionContent>
          <p>这是设置选项 2 的详细说明，默认展开。</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>设置 3</AccordionTrigger>
        <AccordionContent>
          <p>这是设置选项 3 的详细说明。</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const FAQ: Story = {
  render: () => (
    <Accordion className="w-full max-w-2xl">
      <AccordionItem value="item-1">
        <AccordionTrigger>如何重置密码？</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-2">
            <p>要重置密码，请按照以下步骤操作：</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>点击登录页面的"忘记密码"链接</li>
              <li>输入您的注册邮箱地址</li>
              <li>检查您的邮箱并点击重置链接</li>
              <li>输入新密码并确认</li>
            </ol>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>如何联系客服？</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-2">
            <p>您可以通过以下方式联系我们的客服团队：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>电话：400-123-4567</li>
              <li>邮箱：support@example.com</li>
              <li>在线客服：工作日 9:00-18:00</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>支持哪些支付方式？</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-2">
            <p>我们支持以下支付方式：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>微信支付</li>
              <li>支付宝</li>
              <li>银联卡</li>
              <li>信用卡（Visa、MasterCard）</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>订单多久能发货？</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-2">
            <p>订单处理时间如下：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>现货商品：1-2 个工作日</li>
              <li>预售商品：3-5 个工作日</li>
              <li>定制商品：7-10 个工作日</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const ProductDetails: Story = {
  render: () => (
    <Accordion className="w-full max-w-3xl">
      <AccordionItem value="description">
        <AccordionTrigger>商品描述</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-3">
            <p>
              这款产品采用最新技术制造，具有出色的性能和耐用性。经过严格的质量控制，确保每一件产品都符合最高标准。
            </p>
            <p>
              产品设计考虑了用户的使用习惯，界面简洁直观，易于上手。无论是新手还是专业人士，都能快速掌握。
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="specifications">
        <AccordionTrigger>技术规格</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">尺寸</p>
              <p className="text-sm text-muted-foreground">200 x 150 x 50 mm</p>
            </div>
            <div>
              <p className="font-medium">重量</p>
              <p className="text-sm text-muted-foreground">1.2 kg</p>
            </div>
            <div>
              <p className="font-medium">材质</p>
              <p className="text-sm text-muted-foreground">铝合金 + ABS</p>
            </div>
            <div>
              <p className="font-medium">颜色</p>
              <p className="text-sm text-muted-foreground">黑色、白色、银色</p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="shipping">
        <AccordionTrigger>配送信息</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-3">
            <p>
              我们提供全国范围内的配送服务，偏远地区可能需要额外配送时间。
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>标准配送</span>
                <span className="text-muted-foreground">3-5 个工作日</span>
              </div>
              <div className="flex justify-between">
                <span>快速配送</span>
                <span className="text-muted-foreground">1-2 个工作日</span>
              </div>
              <div className="flex justify-between">
                <span>次日达</span>
                <span className="text-muted-foreground">1 个工作日</span>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="warranty">
        <AccordionTrigger>保修政策</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-3">
            <p>
              本产品提供 1 年免费保修服务，保修范围包括：
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>非人为损坏的故障维修</li>
              <li>零部件免费更换</li>
              <li>技术支持服务</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              注意：保修不包含因使用不当或意外造成的损坏。
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
