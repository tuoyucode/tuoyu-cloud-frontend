import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OssApi } from '#/api/system/oss';

import { DictType } from '#/api/system/dict';
import { $t } from '#/locales';

/** 是 / 否（字典 sys_yes_no 的值） */
export const YES = 'Y';
export const NO = 'N';

/** 存储配置页面的路由（后端菜单“文件配置管理”：system 下的 oss-config/index，隐藏页面） */
export const CONFIG_PAGE_PATH = '/system/oss-config/index';

/** 文件列表页面的路由（后端菜单“文件管理”） */
export const FILE_PAGE_PATH = '/system/oss';

/**
 * 允许上传的扩展名，与后端默认配置 tuoyu.upload.allowed-extensions 一致。
 * 只用于文件选择框的筛选；服务端按扩展名和文件内容再校验一次，拒绝时提示原因
 */
export const UPLOAD_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'zip',
  'rar',
  '7z',
  'gz',
  'mp3',
  'wav',
  'mp4',
] as const;

/** 文件选择框的 accept 属性 */
export const UPLOAD_ACCEPT = UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(
  ',',
);

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

/** 文件查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'originalName',
      label: $t('system.oss.originalName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.oss.fileSuffixPlaceholder') },
      fieldName: 'fileSuffix',
      label: $t('system.oss.fileSuffix'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.oss.servicePlaceholder') },
      fieldName: 'service',
      label: $t('system.oss.service'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'createTime',
      label: $t('system.oss.createTime'),
    },
  ];
}

/** 查询表单的值 */
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

/** 文件表格列 */
export function useColumns(): VxeTableGridOptions<OssApi.File>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'url',
      slots: { default: 'preview' },
      title: $t('system.oss.preview'),
      width: 80,
    },
    {
      align: 'left',
      field: 'originalName',
      minWidth: 200,
      title: $t('system.oss.originalName'),
    },
    { field: 'fileSuffix', title: $t('system.oss.fileSuffix'), width: 90 },
    {
      field: 'ext1',
      formatter: ({ row }) => formatFileSize(getFileSize(row)),
      title: $t('system.oss.fileSize'),
      width: 100,
    },
    { field: 'service', minWidth: 100, title: $t('system.oss.service') },
    {
      field: 'createByName',
      minWidth: 100,
      title: $t('system.oss.createByName'),
    },
    { field: 'createTime', title: $t('system.oss.createTime'), width: 170 },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 140,
    },
  ];
}

/** 访问权限（后端 AccessPolicy：0 私有，1 公共读写，2 公共读） */
export function accessPolicyOptions() {
  return [
    { label: $t('system.oss.config.accessPolicyPrivate'), value: '0' },
    { label: $t('system.oss.config.accessPolicyPublicReadWrite'), value: '1' },
    { label: $t('system.oss.config.accessPolicyPublicRead'), value: '2' },
  ];
}

/** 存储配置查询条件 */
export function useConfigSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'configKey',
      label: $t('system.oss.config.configKey'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'bucketName',
      label: $t('system.oss.config.bucketName'),
    },
  ];
}

/** 存储配置表格列 */
export function useConfigColumns(): VxeTableGridOptions<OssApi.Config>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'configKey',
      minWidth: 110,
      title: $t('system.oss.config.configKey'),
    },
    {
      align: 'left',
      field: 'endpoint',
      minWidth: 200,
      title: $t('system.oss.config.endpoint'),
    },
    {
      field: 'bucketName',
      minWidth: 120,
      title: $t('system.oss.config.bucketName'),
    },
    { field: 'prefix', minWidth: 90, title: $t('system.oss.config.prefix') },
    {
      field: 'domainUrl',
      minWidth: 140,
      title: $t('system.oss.config.domainUrl'),
    },
    { field: 'region', minWidth: 100, title: $t('system.oss.config.region') },
    {
      field: 'accessPolicy',
      formatter: ({ cellValue }) =>
        accessPolicyOptions().find((item) => item.value === cellValue)?.label ??
        cellValue,
      title: $t('system.oss.config.accessPolicy'),
      width: 110,
    },
    {
      cellRender: { name: 'CellDict', props: { dictType: DictType.YES_NO } },
      field: 'isHttps',
      title: $t('system.oss.config.isHttps'),
      width: 100,
    },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('system.oss.config.status'),
      width: 120,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 140,
    },
  ];
}

/** 存储配置的新增、编辑表单：两列，备注占整行 */
export function useConfigFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 20,
        placeholder: $t('system.oss.config.configKeyPlaceholder'),
      },
      fieldName: 'configKey',
      help: $t('system.oss.config.configKeyHelp'),
      label: $t('system.oss.config.configKey'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.oss.config.endpointPlaceholder'),
      },
      fieldName: 'endpoint',
      label: $t('system.oss.config.endpoint'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.oss.config.bucketNamePlaceholder'),
      },
      fieldName: 'bucketName',
      label: $t('system.oss.config.bucketName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.oss.config.prefixPlaceholder'),
      },
      fieldName: 'prefix',
      label: $t('system.oss.config.prefix'),
    },
    {
      // 密钥：新增时必填；编辑时不回显，留空表示不修改（抽屉打开时调整）
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        maxlength: 100,
        placeholder: $t('system.oss.config.keyPlaceholder'),
      },
      fieldName: 'accessKey',
      help: $t('system.oss.config.keyHelp'),
      label: $t('system.oss.config.accessKey'),
      rules: 'required',
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
        maxlength: 100,
        placeholder: $t('system.oss.config.keyPlaceholder'),
      },
      fieldName: 'secretKey',
      help: $t('system.oss.config.keyHelp'),
      label: $t('system.oss.config.secretKey'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.oss.config.domainUrlPlaceholder'),
      },
      fieldName: 'domainUrl',
      label: $t('system.oss.config.domainUrl'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.oss.config.regionPlaceholder'),
      },
      fieldName: 'region',
      label: $t('system.oss.config.region'),
    },
    {
      component: 'RadioGroup',
      componentProps: { options: accessPolicyOptions() },
      defaultValue: '1',
      fieldName: 'accessPolicy',
      label: $t('system.oss.config.accessPolicy'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: NO,
      fieldName: 'isHttps',
      label: $t('system.oss.config.isHttps'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}
