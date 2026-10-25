import type * as React from 'react';

/**
 * 图标组件类型
 * 兼容 Phosphor Icons 的 ForwardRefExoticComponent
 * 以及标准的 React.ComponentType
 */
export type IconComponent =
  | React.ComponentType<{ size?: number; weight?: string; className?: string }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | React.ForwardRefExoticComponent<any>;
