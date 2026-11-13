/** Element Plus 标签（ElTag）与时间线节点（ElTimelineItem）的类型 */
export type TagType = 'danger' | 'info' | 'primary' | 'success' | 'warning';

/**
 * 共享包中的状态颜色是语义色名（与 Ant Design 的预设色同名），这里映射为 Element Plus 的类型
 */
const TAG_TYPES: Record<string, TagType> = {
  blue: 'primary',
  default: 'info',
  error: 'danger',
  gray: 'info',
  green: 'success',
  orange: 'warning',
  processing: 'primary',
  red: 'danger',
  success: 'success',
  warning: 'warning',
};

/** 语义色名对应的类型；没有对应时为 info（中性的灰色） */
export function tagType(color?: null | string): TagType {
  return (color && TAG_TYPES[color]) || 'info';
}
