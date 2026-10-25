/* eslint-disable cdd/no-l3-palette */
import type { Meta, StoryObj } from '@storybook/react'
import { Carousel, CarouselItem } from './carousel'

const meta: Meta<typeof Carousel> = {
  title: 'UI/Carousel',
  component: Carousel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    autoplay: {
      control: 'boolean',
      description: '是否自动播放',
    },
    autoplayInterval: {
      control: 'number',
      description: '自动播放间隔（毫秒）',
    },
    showArrows: {
      control: 'boolean',
      description: '是否显示左右箭头',
    },
    showDots: {
      control: 'boolean',
      description: '是否显示底部指示器',
    },
    infinite: {
      control: 'boolean',
      description: '是否无限循环',
    },
  },
}

export default meta
type Story = StoryObj<typeof Carousel>

export const Default: Story = {
  render: () => (
    <Carousel className="w-full max-w-md">
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-primary text-white text-2xl font-bold">
          第一张幻灯片
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-success text-white text-2xl font-bold">
          第二张幻灯片
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-stat-1 text-white text-2xl font-bold">
          第三张幻灯片
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const AutoPlay: Story = {
  render: () => (
    <Carousel autoplay autoplayInterval={3000} className="w-full max-w-md">
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl font-bold">
          自动播放 1
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-gradient-to-r from-green-500 to-teal-500 text-white text-2xl font-bold">
          自动播放 2
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-bold">
          自动播放 3
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const WithoutArrows: Story = {
  render: () => (
    <Carousel showArrows={false} className="w-full max-w-md">
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-primary text-white text-2xl font-bold">
          无箭头 1
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-success text-white text-2xl font-bold">
          无箭头 2
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-stat-1 text-white text-2xl font-bold">
          无箭头 3
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const WithoutDots: Story = {
  render: () => (
    <Carousel showDots={false} className="w-full max-w-md">
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-primary text-white text-2xl font-bold">
          无指示器 1
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-success text-white text-2xl font-bold">
          无指示器 2
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-stat-1 text-white text-2xl font-bold">
          无指示器 3
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const Minimal: Story = {
  render: () => (
    <Carousel showArrows={false} showDots={false} className="w-full max-w-md">
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-primary text-white text-2xl font-bold">
          极简模式 1
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-success text-white text-2xl font-bold">
          极简模式 2
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-stat-1 text-white text-2xl font-bold">
          极简模式 3
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const Finite: Story = {
  render: () => (
    <Carousel infinite={false} className="w-full max-w-md">
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-primary text-white text-2xl font-bold">
          有限循环 1
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-success text-white text-2xl font-bold">
          有限循环 2
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex h-64 items-center justify-center bg-stat-1 text-white text-2xl font-bold">
          有限循环 3
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const ImageCarousel: Story = {
  render: () => (
    <Carousel autoplay autoplayInterval={4000} className="w-full max-w-2xl">
      <CarouselItem>
        <div className="aspect-video bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <span className="text-white text-4xl font-bold">🖼️ 图片 1</span>
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="aspect-video bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
          <span className="text-white text-4xl font-bold">🖼️ 图片 2</span>
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="aspect-video bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
          <span className="text-white text-4xl font-bold">🖼️ 图片 3</span>
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const ProductCarousel: Story = {
  render: () => (
    <Carousel autoplay autoplayInterval={5000} className="w-full max-w-xl">
      <CarouselItem>
        <div className="flex flex-col items-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-2xl font-bold mb-2">产品 A</h3>
          <p className="text-muted-foreground mb-4">高性能解决方案</p>
          <span className="text-3xl font-bold text-primary">¥999</span>
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex flex-col items-center p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-2xl font-bold mb-2">产品 B</h3>
          <p className="text-muted-foreground mb-4">极速响应体验</p>
          <span className="text-3xl font-bold text-success">¥1,299</span>
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="flex flex-col items-center p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold mb-2">产品 C</h3>
          <p className="text-muted-foreground mb-4">精准定位服务</p>
          <span className="text-3xl font-bold text-stat-1">¥1,599</span>
        </div>
      </CarouselItem>
    </Carousel>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <Carousel autoplay autoplayInterval={3000} className="w-full">
      <CarouselItem>
        <div className="aspect-[21/9] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
          <span className="text-white text-5xl font-bold">全宽轮播 1</span>
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="aspect-[21/9] bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 flex items-center justify-center">
          <span className="text-white text-5xl font-bold">全宽轮播 2</span>
        </div>
      </CarouselItem>
      <CarouselItem>
        <div className="aspect-[21/9] bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 flex items-center justify-center">
          <span className="text-white text-5xl font-bold">全宽轮播 3</span>
        </div>
      </CarouselItem>
    </Carousel>
  ),
}
