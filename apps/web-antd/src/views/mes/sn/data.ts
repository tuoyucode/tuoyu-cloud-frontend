import type { SnApi } from '@tuoyu/shared/api/mes/sn';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';

import { $t } from '#/locales';

import { enumOptions } from '../_shared/enums';

/** 可以生成序列号的工单状态 */
export const GENERATABLE_WORKORDER_STATUSES = 'released,in_progress,paused';

/** 可以报废的序列号状态 */
export const SCRAPPABLE_STATUSES = new Set(['completed', 'created']);

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'snCode',
      label: $t('mes.sn.snCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'workorderCode',
      label: $t('mes.sn.workorderCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('SnStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'snStatus',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<SnApi.Sn>['columns'] {
  return [
    {
      field: 'snCode',
      minWidth: 170,
      slots: { default: 'snCode' },
      sortable: true,
      title: $t('mes.sn.snCode'),
    },
    {
      field: 'workorderCode',
      minWidth: 150,
      title: $t('mes.sn.workorderCode'),
    },
    {
      field: 'materialCode',
      minWidth: 120,
      title: $t('mes.sn.materialCode'),
    },
    {
      field: 'materialName',
      minWidth: 150,
      title: $t('mes.sn.materialName'),
    },
    { field: 'batchCode', minWidth: 120, title: $t('mes.sn.batchCode') },
    {
      field: 'snStatus',
      slots: { default: 'snStatus' },
      title: $t('crud.status'),
      width: 100,
    },
    {
      field: 'createTime',
      sortable: true,
      title: $t('mes.sn.createTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 160,
    },
  ];
}

/** 批量生成表单 */
export function useGenerateSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () =>
          toSelectOptions(
            await getMesOptions('workorder', {
              statuses: GENERATABLE_WORKORDER_STATUSES,
            }),
          ),
        optionFilterProp: 'label',
        placeholder: $t('mes.sn.workorderPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workorderId',
      label: $t('mes.sn.workorder'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', max: 10_000, min: 1, precision: 0 },
      defaultValue: 1,
      fieldName: 'count',
      help: $t('mes.sn.countHelp'),
      label: $t('mes.sn.count'),
      rules: 'required',
    },
  ];
}

/** 报废表单 */
export function useScrapSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('mes.sn.scrapReasonPlaceholder'),
        rows: 3,
      },
      fieldName: 'reason',
      label: $t('mes.sn.scrapReason'),
      rules: 'required',
    },
  ];
}
