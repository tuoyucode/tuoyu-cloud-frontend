import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';

import { $t } from '#/locales';

import { equipmentEnumOptions } from '../common/enums';

/** 保养工单的状态动作 */
export type OrderAction = 'cancel' | 'complete' | 'start';

export async function deviceOptions() {
  return toSelectOptions(await getMesOptions('device'));
}

/** 当前状态下可以执行的动作（与后端的状态校验一致；按钮还要看权限） */
export function availableOrderActions(status?: string): OrderAction[] {
  switch (status) {
    case 'in_progress': {
      return ['complete', 'cancel'];
    }
    case 'pending': {
      return ['start', 'cancel'];
    }
    default: {
      return [];
    }
  }
}

/** 查询条件：一行 4 个，其余折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'orderCode',
      label: $t('mes.equipment.maintenanceOrder.orderCode'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: deviceOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'deviceId',
      label: $t('mes.equipment.common.device'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        mode: 'multiple',
        options: equipmentEnumOptions('MaintenanceOrderStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'orderStatus',
      label: $t('mes.equipment.maintenanceOrder.status'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'dueDateRange',
      label: $t('mes.equipment.maintenanceOrder.dueDate'),
    },
  ];
}

/** 查询表单的值转为后端的查询条件：多选的状态用逗号拼接，到期日期拆为起止 */
export function toQuery(
  values: Record<string, any>,
): EquipmentApi.MaintenanceOrderQuery {
  const { dueDateRange, orderStatus, ...rest } = values;
  const query: EquipmentApi.MaintenanceOrderQuery = { ...rest };
  if (Array.isArray(orderStatus) && orderStatus.length > 0) {
    query.orderStatus = orderStatus.join(',');
  } else if (typeof orderStatus === 'string' && orderStatus) {
    query.orderStatus = orderStatus;
  }
  if (Array.isArray(dueDateRange) && dueDateRange.length === 2) {
    query.beginDueDate = dueDateRange[0];
    query.endDueDate = dueDateRange[1];
  }
  return query;
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<EquipmentApi.MaintenanceOrder>['columns'] {
  return [
    {
      field: 'orderCode',
      fixed: 'left',
      minWidth: 160,
      slots: { default: 'orderCode' },
      title: $t('mes.equipment.maintenanceOrder.orderCode'),
    },
    {
      field: 'orderStatus',
      slots: { default: 'status' },
      title: $t('mes.equipment.maintenanceOrder.status'),
      width: 100,
    },
    {
      field: 'deviceName',
      formatter: ({ row }) =>
        [row.deviceCode, row.deviceName].filter(Boolean).join(' '),
      minWidth: 160,
      title: $t('mes.equipment.common.device'),
    },
    {
      field: 'planName',
      minWidth: 140,
      title: $t('mes.equipment.maintenanceOrder.plan'),
    },
    {
      field: 'dueDate',
      slots: { default: 'dueDate' },
      sortable: true,
      title: $t('mes.equipment.maintenanceOrder.dueDate'),
      width: 150,
    },
    {
      field: 'executorName',
      minWidth: 100,
      title: $t('mes.equipment.maintenanceOrder.executor'),
    },
    {
      field: 'finishTime',
      title: $t('mes.equipment.maintenanceOrder.finishTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'workMinutes',
      title: $t('mes.equipment.maintenanceOrder.workMinutes'),
      width: 110,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 240,
    },
  ];
}

/** 完成保养的表单 */
export function useCompleteSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: { maxlength: 1000, rows: 4, showCount: true },
      fieldName: 'actualContent',
      formItemClass: 'md:col-span-2',
      label: $t('mes.equipment.maintenanceOrder.actualContent'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', max: 100_000, min: 1, precision: 0 },
      fieldName: 'workMinutes',
      label: $t('mes.equipment.maintenanceOrder.workMinutes'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 500,
        placeholder: $t('mes.equipment.maintenanceOrder.sparePartsPlaceholder'),
      },
      fieldName: 'spareParts',
      label: $t('mes.equipment.maintenanceOrder.spareParts'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 2,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}
