import type { OssApi } from '@tuoyu/shared/api/system/oss';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType } from '@tuoyu/shared/api/system/dict';
import {
  accessPolicyOptions,
  formatFileSize,
  getFileSize,
  NO,
} from '@tuoyu/shared/pages/system/oss';

import { $t } from '#/locales';

export {
  accessPolicyOptions,
  CONFIG_PAGE_PATH,
  FILE_PAGE_PATH,
  fileExtension,
  formatFileSize,
  getFileSize,
  isImage,
  NO,
  toFileQuery,
  uploadAccept,
  uploadRejection,
  YES,
} from '@tuoyu/shared/pages/system/oss';
export type { FileSearchValues } from '@tuoyu/shared/pages/system/oss';

/** 文件查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'originalName',
      label: $t('system.oss.originalName'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('system.oss.fileSuffixPlaceholder'),
      },
      fieldName: 'fileSuffix',
      label: $t('system.oss.fileSuffix'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('system.oss.servicePlaceholder'),
      },
      fieldName: 'service',
      label: $t('system.oss.service'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'createTime',
      label: $t('system.oss.createTime'),
    },
  ];
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

/** 存储配置查询条件 */
export function useConfigSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'configKey',
      label: $t('system.oss.config.configKey'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
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
      component: 'Input',
      componentProps: {
        autocomplete: 'new-password',
        maxlength: 100,
        placeholder: $t('system.oss.config.keyPlaceholder'),
        showPassword: true,
        type: 'password',
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
      component: 'Input',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
        showWordLimit: true,
        type: 'textarea',
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}
