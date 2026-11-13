import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { equipmentEnumOptions } from '@tuoyu/shared/pages/mes/equipment-enums';

import { $t } from '#/locales';

export async function deviceOptions() {
  return toSelectOptions(await getMesOptions('device'));
}

/** 查询条件：一行 4 个，其余折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'recordCode',
      label: $t('mes.equipment.checkRecord.recordCode'),
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
        options: equipmentEnumOptions('CheckResult'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'checkResult',
      label: $t('mes.equipment.checkRecord.checkResult'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: equipmentEnumOptions('CheckRecordStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'recordStatus',
      label: $t('mes.equipment.checkRecord.recordStatus'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'checkTimeRange',
      label: $t('mes.equipment.checkRecord.checkTime'),
    },
  ];
}

/** 查询表单的值转为后端的查询条件：点检时间按整天转为起止时间 */
export function toQuery(
  values: Record<string, any>,
): EquipmentApi.CheckRecordQuery {
  const { checkTimeRange, ...rest } = values;
  const query: EquipmentApi.CheckRecordQuery = { ...rest };
  if (Array.isArray(checkTimeRange) && checkTimeRange.length === 2) {
    query.beginCheckTime = `${checkTimeRange[0]} 00:00:00`;
    query.endCheckTime = `${checkTimeRange[1]} 23:59:59`;
  }
  return query;
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<EquipmentApi.CheckRecord>['columns'] {
  return [
    {
      field: 'recordCode',
      fixed: 'left',
      minWidth: 160,
      slots: { default: 'recordCode' },
      title: $t('mes.equipment.checkRecord.recordCode'),
    },
    {
      field: 'deviceName',
      formatter: ({ row }) =>
        [row.deviceCode, row.deviceName].filter(Boolean).join(' '),
      minWidth: 180,
      title: $t('mes.equipment.common.device'),
    },
    {
      field: 'checkResult',
      slots: { default: 'checkResult' },
      title: $t('mes.equipment.checkRecord.checkResult'),
      width: 100,
    },
    {
      align: 'right',
      field: 'abnormalCount',
      title: $t('mes.equipment.checkRecord.abnormalCount'),
      width: 100,
    },
    {
      field: 'recordStatus',
      slots: { default: 'recordStatus' },
      title: $t('mes.equipment.checkRecord.recordStatus'),
      width: 100,
    },
    {
      field: 'andonRaised',
      formatter: ({ cellValue }) =>
        cellValue === 'Y' ? $t('mes.equipment.common.yes') : '',
      title: $t('mes.equipment.checkRecord.andonRaised'),
      width: 80,
    },
    {
      field: 'checkerName',
      minWidth: 100,
      title: $t('mes.equipment.checkRecord.checker'),
    },
    {
      field: 'checkTime',
      sortable: true,
      title: $t('mes.equipment.checkRecord.checkTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 220,
    },
  ];
}

/** 可以发起安灯：已提交、结论为异常、还没有发起过 */
export function canRaiseAndon(record: EquipmentApi.CheckRecord) {
  return (
    record.recordStatus === 'completed' &&
    record.checkResult === 'abnormal' &&
    record.andonRaised !== 'Y'
  );
}

/** 可以作废：已提交 */
export function canVoid(record: EquipmentApi.CheckRecord) {
  return record.recordStatus === 'completed';
}
