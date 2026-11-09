import type { OperlogApi } from '@tuoyu/shared/api/monitor/operlog';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 查询条件：第一行 4 个，其余折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'title',
      label: $t('monitor.operlog.titleField'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'operName',
      label: $t('monitor.operlog.operName'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.OPER_TYPE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'businessType',
      label: $t('monitor.operlog.businessType'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.COMMON_STATUS),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('monitor.operlog.status'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'operIp',
      label: $t('monitor.operlog.operIp'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'operTime',
      label: $t('monitor.operlog.operTime'),
    },
  ];
}

/** 把查询表单的值转换为后端的查询条件：日期范围转为 params.beginTime / endTime */
export function toQuery(values: Record<string, any>): OperlogApi.Query {
  const { operTime, ...rest } = values;
  const query: OperlogApi.Query = { ...rest };
  if (Array.isArray(operTime) && operTime.length === 2) {
    query.params = {
      beginTime: `${operTime[0]} 00:00:00`,
      endTime: `${operTime[1]} 23:59:59`,
    };
  }
  return query;
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<OperlogApi.Operlog>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    { field: 'operId', title: $t('monitor.operlog.operId'), width: 180 },
    {
      field: 'title',
      minWidth: 140,
      title: $t('monitor.operlog.titleField'),
    },
    {
      cellRender: { name: 'CellDict', props: { dictType: DictType.OPER_TYPE } },
      field: 'businessType',
      title: $t('monitor.operlog.businessType'),
      width: 100,
    },
    { field: 'operName', minWidth: 110, title: $t('monitor.operlog.operName') },
    { field: 'deptName', minWidth: 120, title: $t('monitor.operlog.dept') },
    { field: 'operIp', minWidth: 130, title: $t('monitor.operlog.operIp') },
    {
      field: 'operLocation',
      minWidth: 120,
      title: $t('monitor.operlog.operLocation'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.COMMON_STATUS },
      },
      field: 'status',
      title: $t('monitor.operlog.status'),
      width: 90,
    },
    {
      field: 'operTime',
      sortable: true,
      title: $t('monitor.operlog.operTime'),
      width: 170,
    },
    {
      field: 'costTime',
      formatter: ({ cellValue }) =>
        cellValue === null || cellValue === undefined
          ? ''
          : $t('monitor.operlog.costTimeValue', { ms: cellValue }),
      sortable: true,
      title: $t('monitor.operlog.costTime'),
      width: 110,
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
