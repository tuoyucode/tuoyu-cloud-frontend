import type { DowntimeReasonApi } from '@tuoyu/shared/api/mes/downtimeReason';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'reasonCode',
      label: $t('mes.downtimeReason.reasonCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'reasonName',
      label: $t('mes.downtimeReason.reasonName'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: enumOptions('DowntimeReasonType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'reasonType',
      label: $t('mes.downtimeReason.reasonType'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        clearable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<DowntimeReasonApi.Reason>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'reasonCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.downtimeReason.reasonCode'),
    },
    {
      field: 'reasonName',
      minWidth: 160,
      title: $t('mes.downtimeReason.reasonName'),
    },
    {
      field: 'reasonType',
      slots: { default: 'reasonType' },
      title: $t('mes.downtimeReason.reasonType'),
      width: 110,
    },
    { field: 'sortNo', title: $t('crud.sort'), width: 100 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 100,
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
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

/** 新增、编辑表单：两列，备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.downtimeReason.reasonCodePlaceholder'),
      },
      fieldName: 'reasonCode',
      label: $t('mes.downtimeReason.reasonCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.downtimeReason.reasonNamePlaceholder'),
      },
      fieldName: 'reasonName',
      label: $t('mes.downtimeReason.reasonName'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: enumOptions('DowntimeReasonType'),
      },
      defaultValue: 'other',
      fieldName: 'reasonType',
      label: $t('mes.downtimeReason.reasonType'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        min: 0,
      },
      defaultValue: 0,
      fieldName: 'sortNo',
      label: $t('crud.sort'),
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      label: $t('crud.status'),
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

/** 加载表单中依赖字典的选项（单选框只需要文字与值） */
export async function loadFormOptions() {
  const status = await getDictOptions(DictType.NORMAL_DISABLE);
  return {
    status: status.map(({ label, value }) => ({ label, value })),
  };
}
