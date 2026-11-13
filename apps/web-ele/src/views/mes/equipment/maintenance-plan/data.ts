import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

export async function deviceOptions() {
  return toSelectOptions(await getMesOptions('device'));
}

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'planName',
      label: $t('mes.equipment.maintenancePlan.planName'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: deviceOptions,
        clearable: true,
        filterable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'deviceId',
      label: $t('mes.equipment.common.device'),
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
export function useColumns(): VxeTableGridOptions<EquipmentApi.MaintenancePlan>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'planName',
      minWidth: 160,
      title: $t('mes.equipment.maintenancePlan.planName'),
    },
    {
      field: 'deviceName',
      formatter: ({ row }) =>
        [row.deviceCode, row.deviceName].filter(Boolean).join(' '),
      minWidth: 160,
      title: $t('mes.equipment.common.device'),
    },
    {
      field: 'maintenanceContent',
      minWidth: 200,
      showOverflow: 'tooltip',
      title: $t('mes.equipment.maintenancePlan.maintenanceContent'),
    },
    {
      align: 'right',
      field: 'cycleDays',
      sortable: true,
      title: $t('mes.equipment.maintenancePlan.cycleDays'),
      width: 100,
    },
    {
      align: 'right',
      field: 'leadDays',
      title: $t('mes.equipment.maintenancePlan.leadDays'),
      width: 120,
    },
    {
      field: 'lastMaintenanceDate',
      title: $t('mes.equipment.maintenancePlan.lastMaintenanceDate'),
      width: 120,
    },
    {
      field: 'nextDueDate',
      slots: { default: 'nextDueDate' },
      sortable: true,
      title: $t('mes.equipment.maintenancePlan.nextDueDate'),
      width: 150,
    },
    {
      field: 'generatedDueDate',
      title: $t('mes.equipment.maintenancePlan.generatedDueDate'),
      width: 120,
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.NORMAL_DISABLE },
      },
      field: 'status',
      title: $t('crud.status'),
      width: 90,
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

/** 新增、编辑表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'planName',
      label: $t('mes.equipment.maintenancePlan.planName'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: deviceOptions,
        class: 'w-full',
        filterable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'deviceId',
      label: $t('mes.equipment.common.device'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        max: 3650,
        min: 1,
        precision: 0,
      },
      fieldName: 'cycleDays',
      label: $t('mes.equipment.maintenancePlan.cycleDays'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        max: 365,
        min: 0,
        precision: 0,
      },
      defaultValue: 0,
      fieldName: 'leadDays',
      help: $t('mes.equipment.maintenancePlan.leadDaysHelp'),
      label: $t('mes.equipment.maintenancePlan.leadDays'),
    },
    {
      component: 'DatePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'lastMaintenanceDate',
      label: $t('mes.equipment.maintenancePlan.lastMaintenanceDate'),
    },
    {
      component: 'DatePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'nextDueDate',
      help: $t('mes.equipment.maintenancePlan.nextDueDateHelp'),
      label: $t('mes.equipment.maintenancePlan.nextDueDate'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 1000,
        rows: 4,
        showWordLimit: true,
        type: 'textarea',
      },
      fieldName: 'maintenanceContent',
      formItemClass: 'md:col-span-2',
      label: $t('mes.equipment.maintenancePlan.maintenanceContent'),
      rules: 'required',
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
