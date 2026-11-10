/**
 * 数量、工时等小数输入框的显示格式：去掉小数末尾多余的 0（例如 9.000000 显示为 9，2.500000 显示为 2.5）。
 *
 * 用作 InputNumber 的 formatter：输入过程中原样显示用户键入的内容，不打断输入；
 * 保存的值仍按输入框的 precision 取舍，只改变显示。
 */
export function trimDecimal(
  value: number | string | undefined,
  info?: { input: string; userTyping: boolean },
): string {
  if (info?.userTyping) {
    return info.input;
  }
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const text = String(value);
  if (!/^-?\d+\.\d+$/.test(text)) {
    return text;
  }
  return text.replace(/\.?0+$/, '');
}
