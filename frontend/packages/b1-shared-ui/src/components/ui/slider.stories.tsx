import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Slider } from './slider'
import { SpeakerHigh, SpeakerX, Sun, Moon } from '@phosphor-icons/react'

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    value: {
      control: 'object',
      description: '当前值（数组形式）',
    },
    onValueChange: {
      action: 'onValueChange',
      description: '值变化时的回调',
    },
    max: {
      control: 'number',
      description: '最大值',
    },
    min: {
      control: 'number',
      description: '最小值',
    },
    step: {
      control: 'number',
      description: '步长',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
  },
}

export default meta
type Story = StoryObj<typeof Slider>

export const Default: Story = {
  render: () => {
    const [value, setValue] = React.useState([50])
    return (
      <div className="w-64 space-y-2">
        <Slider value={value} onValueChange={setValue} />
        <p className="text-sm text-muted-foreground">当前值: {value[0]}</p>
      </div>
    )
  },
}

export const Range: Story = {
  render: () => {
    const [value, setValue] = React.useState([25, 75])
    return (
      <div className="w-64 space-y-2">
        <Slider value={value} onValueChange={setValue} />
        <p className="text-sm text-muted-foreground">范围: {value[0]} - {value[1]}</p>
      </div>
    )
  },
}

export const CustomStep: Story = {
  render: () => {
    const [value, setValue] = React.useState([5])
    return (
      <div className="w-64 space-y-2">
        <Slider value={value} onValueChange={setValue} max={10} step={0.5} />
        <p className="text-sm text-muted-foreground">当前值: {value[0]}</p>
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="w-64 space-y-4">
      <Slider value={[50]} disabled />
      <Slider value={[25, 75]} disabled />
    </div>
  ),
}

export const VolumeControl: Story = {
  render: () => {
    const [volume, setVolume] = React.useState([50])
    return (
      <div className="w-64 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">音量</label>
          <span className="text-sm text-muted-foreground">{volume[0]}%</span>
        </div>
        <div className="flex items-center gap-2">
          <SpeakerX className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="flex-1"
          />
          <SpeakerHigh className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  },
}

export const PriceRange: Story = {
  render: () => {
    const [priceRange, setPriceRange] = React.useState([100, 1000])
    return (
      <div className="w-80 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">价格范围</label>
          <span className="text-sm text-muted-foreground">
            ¥{priceRange[0]} - ¥{priceRange[1]}
          </span>
        </div>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={5000}
          step={100}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>¥0</span>
          <span>¥5000</span>
        </div>
      </div>
    )
  },
}

export const Brightness: Story = {
  render: () => {
    const [brightness, setBrightness] = React.useState([75])
    return (
      <div className="w-64 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">亮度</label>
          <span className="text-sm text-muted-foreground">{brightness[0]}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={brightness}
            onValueChange={setBrightness}
            max={100}
            step={1}
            className="flex-1"
          />
          <Sun className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  },
}

export const Progress: Story = {
  render: () => {
    const [progress, setProgress] = React.useState([30])
    return (
      <div className="w-full max-w-md space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">播放进度</label>
          <span className="text-sm text-muted-foreground">{progress[0]}%</span>
        </div>
        <Slider
          value={progress}
          onValueChange={setProgress}
          max={100}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>3:45</span>
        </div>
      </div>
    )
  },
}

export const Rating: Story = {
  render: () => {
    const [rating, setRating] = React.useState([4])
    return (
      <div className="w-64 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">评分</label>
          <span className="text-sm text-muted-foreground">{rating[0]} / 5</span>
        </div>
        <Slider
          value={rating}
          onValueChange={setRating}
          min={0}
          max={5}
          step={0.5}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>5</span>
        </div>
      </div>
    )
  },
}

export const MultipleSliders: Story = {
  render: () => {
    const [volume, setVolume] = React.useState([50])
    const [bass, setBass] = React.useState([30])
    const [treble, setTreble] = React.useState([70])
    return (
      <div className="w-64 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">音量</label>
            <span className="text-sm text-muted-foreground">{volume[0]}</span>
          </div>
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">低音</label>
            <span className="text-sm text-muted-foreground">{bass[0]}</span>
          </div>
          <Slider
            value={bass}
            onValueChange={setBass}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">高音</label>
            <span className="text-sm text-muted-foreground">{treble[0]}</span>
          </div>
          <Slider
            value={treble}
            onValueChange={setTreble}
            max={100}
            step={1}
          />
        </div>
      </div>
    )
  },
}

export const WithLabels: Story = {
  render: () => {
    const [value, setValue] = React.useState([50])
    return (
      <div className="w-64 space-y-2">
        <label className="text-sm font-medium">满意度</label>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>不满意</span>
          <span>非常满意</span>
        </div>
      </div>
    )
  },
}
