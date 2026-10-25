import { Fragment } from 'react';
// 直接从兄弟组件源文件导入，不经过包出口 index.ts，避免 index ↔ step-navigator 循环引用
// （循环在生产分包后导致 chunk 间循环依赖、ESM 初始化顺序损坏、React undefined 白屏）。
import { Icons } from '../ui/icons';
import { cn } from "cn";

export interface StepNavigatorStep {
  /** 步骤序号（从 1 开始） */
  id: number;
  /** 步骤名称 */
  label: string;
  /** 步骤描述（可选，展示于名称下方） */
  description?: string;
}

export interface StepNavigatorProps {
  /** 步骤定义数组 */
  steps: StepNavigatorStep[];
  /** 当前步骤 id */
  currentStep: number;
  /** 已完成的步骤 id 数组 */
  completedSteps?: number[];
  /**
   * 步骤跳转回调；省略时组件为纯展示（不可点击）。
   * 跳转准入由页面侧 handleStepChange 把关时，可不传 disableStepJump 而在回调内拦截。
   */
  onStepChange?: (step: number) => void;
  /** true 时未完成步骤不可点击（只能跳已完成步或停留在当前步） */
  disableStepJump?: boolean;
  className?: string;
}

/**
 * 向导步骤导航器：圆圈序号/对勾居左 + 右列步骤名/简介（左对齐）+ 连接箭头，
 * 展示分步进度并（可选）支持跳转。横排紧凑布局（整条约 56px 高）。
 * 供多步向导页使用（表单页/向导类taxonomy §2.3 向导子类的步骤指示器承载）。
 */
export function StepNavigator({
  steps,
  currentStep,
  completedSteps = [],
  onStepChange,
  disableStepJump = false,
  className,
}: StepNavigatorProps) {
  const interactive = typeof onStepChange === 'function';

  const handleStepClick = (stepId: number) => {
    if (!interactive) return;
    // 禁用跳转时只能去已完成的步骤或留在当前步骤
    if (disableStepJump && !completedSteps.includes(stepId) && stepId !== currentStep) {
      return;
    }
    onStepChange(stepId);
  };

  return (
    <div className={cn('flex items-center justify-between w-full max-w-detail mx-auto mb-4', className)}>
      {steps.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const clickable = interactive && (isCurrent || isCompleted || !disableStepJump);

        return (
          <Fragment key={step.id}>
            {/* 步骤指示器：圆圈居左，名称/简介右列左对齐 */}
            <div
              className={cn(
                'flex items-center gap-2.5 transition-all duration-normal',
                clickable ? 'cursor-pointer hover:scale-105' : interactive ? 'opacity-50 cursor-not-allowed' : '',
              )}
              onClick={() => handleStepClick(step.id)}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleStepClick(step.id);
                    }
                  : undefined
              }
            >
              {/* 步骤圆圈（数字加大一号） */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-base font-medium transition-all duration-normal',
                  isCurrent
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                    : isCompleted
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? <Icons.Check className="w-4 h-4" /> : step.id}
              </div>

              {/* 步骤名称 + 简介（居左） */}
              <div className="flex flex-col">
                <div
                  className={cn(
                    'text-sm font-medium leading-tight',
                    isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground leading-tight">{step.description}</div>
                )}
              </div>
            </div>

            {/* 连接线 */}
            {index < steps.length - 1 && (
              <div className="flex-1 flex items-center justify-center px-2">
                <Icons.ChevronRight
                  className={cn(
                    'w-5 h-5 transition-colors duration-normal',
                    isCompleted ? 'text-success' : 'text-muted-foreground',
                  )}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
