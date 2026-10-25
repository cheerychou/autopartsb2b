import { Fragment, memo } from 'react';
import { Check, X } from "@phosphor-icons/react";
import { cn } from "cn";

/**
 * 步骤状态枚举
 */
export type StepStatus = 'completed' | 'active' | 'pending' | 'cancelled';

/**
 * 单个步骤定义
 */
export interface StageFlowStep {
  /** 步骤唯一标识 */
  key: string;
  /** 步骤序号（自动生成时可不传） */
  index?: number;
  /** 步骤标题，如「服务接待」 */
  label: string;
  /** 步骤状态文本，如「已完成」「施工中」「待派工」 */
  statusText: string;
  /** 步骤状态，控制圆点和文字的视觉样式 */
  status: StepStatus;
  /** 负责人/执行人（可选） */
  assignee?: string;
  /** 是否与下一步之间使用虚线分隔（表示阶段分界） */
  phaseBoundary?: boolean;
}

/**
 * StageFlowBar 组件属性
 */
export interface StageFlowBarProps {
  /** 步骤列表，按顺序排列 */
  steps: StageFlowStep[];
  /** 自定义类名 */
  className?: string;
}

/**
 * 获取步骤圆点样式
 */
function getCircleStyle(status: StepStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-primary-foreground border-primary-foreground flex items-center justify-center';
    case 'active':
      return 'bg-transparent border-primary-foreground';
    case 'cancelled':
      return 'bg-destructive border-destructive flex items-center justify-center';
    case 'pending':
    default:
      return 'bg-primary-foreground/15 border-primary-foreground/25';
  }
}

/**
 * 获取步骤状态文本样式
 */
function getStatusTextStyle(status: StepStatus): string {
  switch (status) {
    case 'completed':
      return 'text-primary-foreground/80';
    case 'active':
      return 'text-primary-foreground';
    case 'cancelled':
      return 'text-destructive';
    case 'pending':
    default:
      return 'text-primary-foreground/55';
  }
}

/**
 * 获取连接线样式
 */
function getConnectorStyle(currentStep: StageFlowStep, nextStep: StageFlowStep): string {
  const isCompleted = currentStep.status === 'completed' && nextStep.status !== 'pending';
  const base = 'h-0.5 flex-1 mx-2 mt-[55px]';

  if (currentStep.phaseBoundary) {
    return cn(base, isCompleted ? 'bg-primary-foreground/85 border-l-2 border-l-primary-foreground/40 border-dashed' : 'bg-primary-foreground/25 border-l-2 border-l-primary-foreground/40 border-dashed');
  }

  return cn(base, isCompleted ? 'bg-primary-foreground/85' : 'bg-primary-foreground/25');
}

/**
 * 阶段流转条组件
 * 以可视化方式展示工作阶段和状态变化，适用于各类详情页顶部
 */
function StageFlowBarComponent({ steps, className }: StageFlowBarProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div
      data-slot="stage-flow-bar"
      className={cn(
        'rounded-lg border-0 bg-primary text-primary-foreground shadow-sm overflow-hidden',
        className
      )}
    >
      <div className="p-6 px-12">
        <div className="flex items-start justify-between mb-4 relative">
          {steps.map((step, idx) => (
            <Fragment key={step.key}>
              <div className="flex flex-col items-center z-10">
                <span className="text-xs mb-1 whitespace-nowrap text-primary-foreground/70">
                  {idx + 1}. {step.label}
                </span>
                <span
                  className={cn(
                    'text-base mb-1 whitespace-nowrap font-medium',
                    getStatusTextStyle(step.status)
                  )}
                >
                  {step.statusText}
                </span>
                <div
                  className={cn('w-4 h-4 rounded-full border-2 shrink-0', getCircleStyle(step.status))}
                >
                  {step.status === 'completed' && (
                    <Check
                      className="w-3 h-3 text-primary"
                      strokeWidth={3}
                    />
                  )}
                  {step.status === 'cancelled' && (
                    <X className="w-3 h-3 text-destructive-foreground" />
                  )}
                </div>
                {step.assignee && (
                  <div className="text-xs mt-2 whitespace-nowrap text-primary-foreground/70">
                    {step.assignee}
                  </div>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={getConnectorStyle(step, steps[idx + 1])} />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 阶段流转条组件（使用 React.memo 优化）
 * 只有当 steps 引用发生变化时才重新渲染
 */
export const StageFlowBar = memo(StageFlowBarComponent, (prevProps, nextProps) => {
  if (prevProps.steps.length !== nextProps.steps.length) return false;
  return prevProps.steps.every(
    (step, i) =>
      step.key === nextProps.steps[i].key &&
      step.status === nextProps.steps[i].status &&
      step.statusText === nextProps.steps[i].statusText &&
      step.assignee === nextProps.steps[i].assignee
  );
});
