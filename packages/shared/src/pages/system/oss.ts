import type { OssApi } from '../../api/system/oss';

import { $t } from '@vben/locales';

/** 是 / 否（字典 sys_yes_no 的值） */
export const YES = 'Y';
export const NO = 'N';

/** 存储配置页面的路由（后端菜单“文件配置管理”：system 下的 oss-config/index，隐藏页面） */
export const CONFIG_PAGE_PATH = '/system/oss-config/index';

/** 文件列表页面的路由（后端菜单“文件管理”） */
export const FILE_PAGE_PATH = '/system/oss';

/** 文件选择框的 accept 属性：按服务端的扩展名白名单生成 */
export function uploadAccept(extensions: readonly string[]): string {
  return extensions.map((ext) => `.${ext}`).join(',');
}

/** 文件名的扩展名（小写，不带点）；没有扩展名时为空字符串 */
export function fileExtension(name: string): string {
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index + 1).toLowerCase() : '';
}

/**
 * 上传前按服务端的限制检查：类型不在白名单中、超过单个文件的上限时返回原因的文案键，否则返回 undefined。
 * 只是提前提示；服务端按扩展名与文件内容再校验一次
 */
export function uploadRejection(
  file: { name: string; size: number },
  config: { allowedExtensions: readonly string[]; maxFileSize: number },
): 'system.oss.uploadTooLarge' | 'system.oss.uploadTypeNotAllowed' | undefined {
  if (!config.allowedExtensions.includes(fileExtension(file.name))) {
    return 'system.oss.uploadTypeNotAllowed';
  }
  if (config.maxFileSize >= 0 && file.size > config.maxFileSize) {
    return 'system.oss.uploadTooLarge';
  }
  return undefined;
}

/** 可以在列表中直接预览的图片类型 */
const IMAGE_SUFFIXES = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

/** 是否为可预览的图片 */
export function isImage(file: Pick<OssApi.File, 'fileSuffix'>): boolean {
  return IMAGE_SUFFIXES.has((file.fileSuffix ?? '').toLowerCase());
}

/** 从扩展信息（ext1，JSON 字符串）中取文件大小；没有时返回 undefined */
export function getFileSize(file: Pick<OssApi.File, 'ext1'>) {
  if (!file.ext1) {
    return undefined;
  }
  try {
    const size = (JSON.parse(file.ext1) as { fileSize?: unknown }).fileSize;
    return typeof size === 'number' && size >= 0 ? size : undefined;
  } catch {
    return undefined;
  }
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** 把字节数格式化为 1.5 MB 这种形式 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) {
    return '';
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const text =
    unit === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  return `${text} ${SIZE_UNITS[unit]}`;
}

/** 文件查询表单的值 */
export interface FileSearchValues {
  createTime?: [string, string];
  fileSuffix?: string;
  originalName?: string;
  service?: string;
}

/** 把查询表单的值转换为接口参数：上传时间按整天查询 */
export function toFileQuery(values: FileSearchValues): OssApi.FileQuery {
  const { createTime, ...rest } = values;
  const query: OssApi.FileQuery = { ...rest };
  if (createTime?.[0] && createTime[1]) {
    query['params[beginCreateTime]'] = `${createTime[0]} 00:00:00`;
    query['params[endCreateTime]'] = `${createTime[1]} 23:59:59`;
  }
  return query;
}

/** 访问权限（后端 AccessPolicy：0 私有，1 公共读写，2 公共读） */
export function accessPolicyOptions() {
  return [
    { label: $t('system.oss.config.accessPolicyPrivate'), value: '0' },
    { label: $t('system.oss.config.accessPolicyPublicReadWrite'), value: '1' },
    { label: $t('system.oss.config.accessPolicyPublicRead'), value: '2' },
  ];
}

/** 存储配置中的密钥字段与接口中“是否已设置”标记的对应关系：编辑时不回显，留空表示不修改 */
export const KEY_FIELDS = [
  ['accessKey', 'accessKeySet'],
  ['secretKey', 'secretKeySet'],
] as const;

/** 编辑存储配置时去掉留空的密钥，后端不会修改这些字段 */
export function withoutEmptyKeys(values: OssApi.ConfigForm): OssApi.ConfigForm {
  const { accessKey, secretKey, ...rest } = values;
  return {
    ...rest,
    ...(accessKey ? { accessKey } : {}),
    ...(secretKey ? { secretKey } : {}),
  };
}
