import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OnlineApi } from '#/api/monitor/online';

import { formatDateTime } from '@vben/utils';

import { DictType } from '#/api/system/dict';
import { $t } from '#/locales';

/** 查询条件：后端按完全相同匹配 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('monitor.online.exactPlaceholder') },
      fieldName: 'userName',
      label: $t('monitor.online.userName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('monitor.online.exactPlaceholder') },
      fieldName: 'ipaddr',
      label: $t('monitor.online.ipaddr'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<OnlineApi.Online>['columns'] {
  return [
    {
      field: 'userName',
      minWidth: 140,
      slots: { default: 'userName' },
      title: $t('monitor.online.userName'),
    },
    { field: 'deptName', minWidth: 120, title: $t('monitor.online.dept') },
    { field: 'clientKey', minWidth: 90, title: $t('monitor.online.clientKey') },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.DEVICE_TYPE },
      },
      field: 'deviceType',
      title: $t('monitor.online.deviceType'),
      width: 100,
    },
    { field: 'ipaddr', minWidth: 130, title: $t('monitor.online.ipaddr') },
    {
      field: 'loginLocation',
      minWidth: 120,
      title: $t('monitor.online.loginLocation'),
    },
    { field: 'browser', minWidth: 110, title: $t('monitor.online.browser') },
    { field: 'os', minWidth: 110, title: $t('monitor.online.os') },
    {
      field: 'loginTime',
      formatter: ({ cellValue }) =>
        cellValue ? formatDateTime(Number(cellValue)) : '',
      title: $t('monitor.online.loginTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 120,
    },
  ];
}
