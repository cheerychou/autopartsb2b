import * as React from "react"
import { cn } from "cn"
// 兄弟组件从源文件导入（不经包出口 index.ts，避免 index ↔ 组件循环引用，见 step-navigator.tsx 头注释）
import { PageContainer } from "./page-container"
import { PageHeader } from "./page-header"
import { StepNavigator, type StepNavigatorStep } from "./step-navigator"
import { FormFooter } from "../form/form-footer"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import { ErrorState } from "../ui/error-state"
import { toErrorMessage } from "../../lib/normalize-error"

export interface WizardPageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 页面标题（唯一标题通道，壳内渲染 PageHeader，禁止页面手写 h1） */
  title: string
  /** 实体身份元信息（如「订单 SO20260930001」），标题右侧灰字；准入见 PAGE_HEADER_USAGE.md */
  subtitle?: string
  /** 面包屑项，渲染在标题行上方 */
  breadcrumbItems?: Array<{ label: string; href?: string }>
  /** 返回回调（三定律 1：返回固定在标题左侧）。路径返回由页面侧 navigate 包装 */
  onBack?: () => void
  /** 头部右侧操作（打印等非提交类动作） */
  action?: React.ReactNode
  /**
   * 底栏左侧次级动作（如取消/保存草稿），渲染于「上一步」之前——
   * ENG-FE-DESIGN-005 §5.2：暂存/放弃类动作唯一合规位置（禁止头部 action）。
   * API 契约：left 渲染顺序 = footerSecondary → 上一步。
   */
  footerSecondary?: React.ReactNode
  /** 底栏吸底开关（D1=C：模板默认开启，页面可 opt-out；不超一屏时无副作用） */
  stickyFooter?: boolean
  /** 步骤定义（透传 StepNavigator） */
  steps: StepNavigatorStep[]
  /** 当前步骤 id（受控，状态归页面） */
  currentStep: number
  /** 已完成步骤 id 数组（透传；页面自持，禁止 push 当前步造成重复） */
  completedSteps?: number[]
  /** 步骤跳转回调；省略时步骤条纯展示 */
  onStepChange?: (step: number) => void
  /** 上一步回调；不传 = 单向流（不渲染「上一步」，如数据导入 upload→preview→result） */
  onPrevious?: () => void
  /** 下一步回调（中间步）；准入校验/暂存由页面在回调内把关 */
  onNext?: () => void
  /** 末步提交回调；只传 onNext 未传 onSubmit 时提交步退化为 onNext */
  onSubmit?: () => void
  /** 主导提交所在步骤 id，默认末步。末步为结果反馈屏（提交后的落点）时指向其前一步，
   *  如数据导入 upload(1)→preview(2, 提交)→result(3, 反馈屏)：submitStep={2} */
  submitStep?: number
  /** 提交步按钮文案，默认「提交」 */
  submitLabel?: string
  /** 提交中：提交按钮 loading、底栏按钮全部防重 */
  submitting?: boolean
  /** 下一步/提交禁用（步骤完成判据由页面推导后传入） */
  nextDisabled?: boolean
  /** 数据三态：loading/error 时头部保留、主体整块替换 */
  loading?: boolean
  /** 错误（truthy 渲染 ErrorState；兼容 Error/string，内部归一文案） */
  error?: unknown
  /** 错误重试回调 */
  onRetry?: () => void
  /** 当前步内容（由页面按 currentStep 条件渲染） */
  children: React.ReactNode
  /** 内容区类名：窄向导传 "max-w-detail mx-auto"；默认全宽（多列栅格向导） */
  contentClassName?: string
}

/**
 * 向导页统一模板（taxonomy §2.3 表单页·向导子类 的壳承载，规范见
 * docs/frontend/design/ENG-FE-DESIGN-004 §3.2）。
 *
 * 共性骨架 = PageHeader 通道 → StepNavigator（裸放）→ 当前步内容 → FormFooter 底栏。
 * 只编排布局不做逻辑：步骤状态、准入校验、分步暂存全部留在页面。
 *
 * ⚠️ StepNavigator 必须是 PageContainer 的直接子元素（裸放，禁止包 wrapper）：
 * PageContainer 以 `[&>*]:mb-0!` 中和直接子元素的 mb——裸放时步骤条自带的 mb-8
 * 被中和、纵向间距归 gap-section；包 wrapper 则 mb-8 存活并与 gap 叠加出双倍间距。
 *
 * @example 双向分步向导
 *   <WizardPage title="新建订单" breadcrumbItems={[{ label: '首页' }, { label: '订单管理' }]}
 *     onBack={cancel} steps={steps} currentStep={step} completedSteps={completed}
 *     onStepChange={handleStepChange} onPrevious={goPrev} onNext={goNext}
 *     onSubmit={submit} submitting={submitting} nextDisabled={!stepValid}>
 *     {step === 1 && <ReceptionForm ... />}
 *   </WizardPage>
 *
 * @example 单向流（不传 onPrevious/onStepChange，全程无「上一步」）
 *   <WizardPage title="数据导入" steps={STEPS} currentStep={step}
 *     onNext={goNext} onSubmit={confirmImport} submitLabel="确认导入" submitting={loading}>
 *     {step === 1 && <UploadCard ... />}
 *   </WizardPage>
 */
export function WizardPage({
  title,
  subtitle,
  breadcrumbItems,
  onBack,
  action,
  footerSecondary,
  stickyFooter = true,
  steps,
  currentStep,
  completedSteps,
  onStepChange,
  onPrevious,
  onNext,
  onSubmit,
  submitStep,
  submitLabel = "提交",
  submitting = false,
  nextDisabled = false,
  loading = false,
  error,
  onRetry,
  children,
  contentClassName,
  className,
  ...props
}: WizardPageProps) {
  const firstId = steps[0]?.id ?? 1
  const lastId = steps[steps.length - 1]?.id ?? 1
  const commitStep = submitStep ?? lastId
  const isFirst = currentStep <= firstId
  const isCommit = currentStep >= commitStep
  // 反馈屏型（commitStep < lastId）走到末步 = 提交已完成的结果展示，底栏整体不渲染；
  // 常规型（提交步 = 末步）末步仍渲染提交按钮
  const isTerminal = currentStep >= lastId && commitStep < lastId
  const hasFooter = !isTerminal && Boolean(onNext || onSubmit)

  return (
    <PageContainer className={cn(className)} {...props}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbItems={breadcrumbItems}
        onBack={onBack}
        action={action}
      />

      {loading || error ? (
        <div className="flex flex-col items-center justify-center h-[400px]">
          {error ? (
            <ErrorState message={toErrorMessage(error)} onRetry={onRetry} />
          ) : (
            <Spinner label="加载中..." />
          )}
        </div>
      ) : (
        <>
          {/* 裸放约束：见组件 JSDoc——mb-8 被 PageContainer 中和，间距归 gap-section */}
          <StepNavigator
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepChange={onStepChange}
          />

          <div className={cn("min-w-0", contentClassName)}>{children}</div>

          {hasFooter && (
            <FormFooter
              sticky={stickyFooter}
              left={
                // 反馈屏型提交后不可回退（已提交的数据不允许「上一步」改写）；
                // 常规型（提交步=末步）末步保留上一步可回看。
                // 渲染顺序契约：footerSecondary → 上一步（005 §5.2）——两者并存
                footerSecondary ||
                onPrevious ? (
                  <>
                    {footerSecondary}
                    {onPrevious && !isFirst && !(isCommit && commitStep < lastId) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onPrevious}
                        disabled={submitting}
                      >
                        上一步
                      </Button>
                    )}
                  </>
                ) : undefined
              }
            >
              {isCommit ? (
                <Button
                  type="button"
                  onClick={onSubmit ?? onNext}
                  loading={submitting}
                  disabled={submitting || nextDisabled}
                >
                  {submitLabel}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onNext}
                  disabled={submitting || nextDisabled}
                >
                  下一步
                </Button>
              )}
            </FormFooter>
          )}
        </>
      )}
    </PageContainer>
  )
}
