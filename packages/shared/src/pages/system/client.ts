import { $t } from '@vben/locales';

/** 超时时间（秒）的表格显示：-1 表示不限制 */
export function formatSeconds({ cellValue }: { cellValue?: null | number }) {
  if (cellValue === undefined || cellValue === null) {
    return '';
  }
  return cellValue === -1
    ? $t('system.client.unlimited')
    : $t('system.client.secondsValue', { value: cellValue });
}

/** 访问路径、IP 白名单等规则列表在表单中每行一条 */
export function toLines(list?: string[]) {
  return list?.join('\n') ?? '';
}
