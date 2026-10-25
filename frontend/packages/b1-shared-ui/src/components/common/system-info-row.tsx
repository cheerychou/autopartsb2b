import { InfoField } from './info-field';

/**
 * 系统信息行组件属性接口
 */
export interface SystemInfoRowProps {
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  /** 保留接口兼容（历史页面传 mode），内部已改用 InfoField 始终只读展示 */
  mode?: 'create' | 'edit' | 'view';
  columns?: 3 | 4;
}

/**
 * 系统信息行组件
 *
 * 标准化展示创建时间、创建人员、更新时间、更新人员四个系统字段。
 * 固定位于基本信息卡片（第一个 FormSection）的最后一行，占满四列栅格，
 * 上方带分割线与业务字段区分。
 *
 * 设计规范：
 * - 始终占满 FormSection 的四列宽度（col-span-4）
 * - 上方有分割线与业务字段分隔
 * - 内部固定 grid-cols-4 布局
 * - 所有字段均为只读（由 InfoField 只读展示）
 */
export function SystemInfoRow({
  createdAt = '',
  createdBy = '',
  updatedAt = '',
  updatedBy = '',
  mode = 'view',
  columns = 4,
}: SystemInfoRowProps) {
  void mode; // mode 仅保留接口兼容，InfoField 始终只读

  const spanClass = columns === 3 ? 'col-span-3' : 'col-span-4';
  const gridClass = columns === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <>
      <div className={`${spanClass} border-t my-2`} />
      <div className={`${spanClass} ${gridClass} gap-4 grid`}>
        <InfoField label="创建时间" value={createdAt} type="date" />
        <InfoField label="创建人员" value={createdBy} />
        <InfoField label="更新时间" value={updatedAt} type="datetime" />
        <InfoField label="更新人员" value={updatedBy} />
      </div>
    </>
  );
}
