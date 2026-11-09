import type { LogininfoApi } from '@tuoyu/shared/api/monitor/logininfo';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'userName',
      label: $t('monitor.logininfo.userName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'ipaddr',
      label: $t('monitor.logininfo.ipaddr'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.COMMON_STATUS),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('monitor.logininfo.status'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'loginTime',
      label: $t('monitor.logininfo.loginTime'),
    },
  ];
}

/** 把查询表单的值转换为后端的查询条件：日期范围转为 params.beginTime / endTime */
export function toQuery(values: Record<string, any>): LogininfoApi.Query {
  const { loginTime, ...rest } = values;
  const query: LogininfoApi.Query = { ...rest };
  if (Array.isArray(loginTime) && loginTime.length === 2) {
    query.params = {
      beginTime: `${loginTime[0]} 00:00:00`,
      endTime: `${loginTime[1]} 23:59:59`,
    };
  }
  return query;
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
