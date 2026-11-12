/** 字典类型标识的格式，与后端 RegexConstants.DICTIONARY_TYPE 一致 */
export const DICT_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/;

/** 字典数据回显样式（listClass）的可选值 */
export const LIST_CLASSES = [
  'default',
  'primary',
  'success',
  'info',
  'warning',
  'danger',
] as const;
