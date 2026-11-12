import type { LogininfoApi } from '@tuoyu/shared/api/monitor/logininfo';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

export { toQuery } from '@tuoyu/shared/pages/monitor/logininfo';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'userName',
      label: $t('monitor.logininfo.userName'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'ipaddr',
      label: $t('monitor.logininfo.ipaddr'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: () => getDictOptions(DictType.COMMON_STATUS),
        clearable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('monitor.logininfo.status'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'loginTime',
      label: $t('monitor.logininfo.loginTime'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<LogininfoApi.Logininfo>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'userName',
      minWidth: 120,
      title: $t('monitor.logininfo.userName'),
    },
    {
      field: 'clientKey',
      minWidth: 90,
      title: $t('monitor.logininfo.clientKey'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.DEVICE_TYPE },
      },
      field: 'deviceType',
      title: $t('monitor.logininfo.deviceType'),
      width: 100,
    },
    { field: 'ipaddr', minWidth: 130, title: $t('monitor.logininfo.ipaddr') },
    {
      field: 'loginLocation',
      minWidth: 120,
      title: $t('monitor.logininfo.loginLocation'),
    },
    { field: 'browser', minWidth: 110, title: $t('monitor.logininfo.browser') },
    { field: 'os', minWidth: 110, title: $t('monitor.logininfo.os') },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.COMMON_STATUS },
      },
      field: 'status',
      title: $t('monitor.logininfo.status'),
      width: 90,
    },
    { field: 'msg', minWidth: 160, title: $t('monitor.logininfo.msg') },
    {
      field: 'loginTime',
      sortable: true,
      title: $t('monitor.logininfo.loginTime'),
      width: 170,
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
