import type { DeviceApi } from '@tuoyu/shared/api/mes/device';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 级联的位置字段：上级变化时清空下级 */
export const LOCATION_FIELDS = [
  'factoryId',
  'workshopId',
  'lineId',
  'stationId',
] as const;

/** 下拉选项（按上级过滤；上级未选时列出全部） */
function optionsOf(resource: string) {
  return async (params?: Record<string, string | undefined>) =>
    toSelectOptions(await getMesOptions(resource, params));
}

function selectProps(
  api: (params?: Record<string, string | undefined>) => Promise<unknown>,
) {
  return {
    allowClear: true,
    api,
    class: 'w-full',
    optionFilterProp: 'label',
    placeholder: $t('crud.selectPlaceholder'),
    showSearch: true,
  };
}

/** 查询条件：一行最多 4 个，多余的折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: selectProps(optionsOf('factory')),
      fieldName: 'factoryId',
      label: $t('mes.device.factory'),
    },
    {
      component: 'ApiSelect',
      componentProps: selectProps(optionsOf('workshop')),
      dependencies: {
        resolve: ({ values }) => ({
          componentProps: { params: { factoryId: values.factoryId } },
        }),
        triggerFields: ['factoryId'],
      },
      fieldName: 'workshopId',
      label: $t('mes.device.workshop'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'deviceCode',
      label: $t('mes.device.deviceCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'deviceName',
      label: $t('mes.device.deviceName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'deviceType',
      label: $t('mes.device.deviceType'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<DeviceApi.Device>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'deviceCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.device.deviceCode'),
    },
    {
      field: 'deviceName',
      minWidth: 160,
      title: $t('mes.device.deviceName'),
    },
    {
      field: 'deviceType',
      minWidth: 100,
      title: $t('mes.device.deviceType'),
    },
    { field: 'model', minWidth: 120, title: $t('mes.device.model') },
    { field: 'factoryName', minWidth: 120, title: $t('mes.device.factory') },
    {
      field: 'workshopName',
      minWidth: 120,
      title: $t('mes.device.workshop'),
    },
    { field: 'lineName', minWidth: 120, title: $t('mes.device.line') },
    {
      field: 'stationName',
      minWidth: 120,
      title: $t('mes.device.station'),
    },
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

/**
 * 新增、编辑表单：两列，备注占整行。
 * 位置填到哪一级都可以（至少选工厂），下级的选项按已选的上级过滤，后端校验同属一条链并补齐上级
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.device.deviceCodePlaceholder'),
      },
      fieldName: 'deviceCode',
      label: $t('mes.device.deviceCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.device.deviceNamePlaceholder'),
      },
      fieldName: 'deviceName',
      label: $t('mes.device.deviceName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('mes.device.deviceTypePlaceholder'),
      },
      fieldName: 'deviceType',
      label: $t('mes.device.deviceType'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'model',
      label: $t('mes.device.model'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'manufacturer',
      formItemClass: 'md:col-span-2',
      label: $t('mes.device.manufacturer'),
    },
    {
      component: 'ApiSelect',
      componentProps: selectProps(optionsOf('factory')),
      fieldName: 'factoryId',
      label: $t('mes.device.factory'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: selectProps(optionsOf('workshop')),
      dependencies: {
        resolve: ({ values }) => ({
          componentProps: { params: { factoryId: values.factoryId } },
        }),
        triggerFields: ['factoryId'],
      },
      fieldName: 'workshopId',
      label: $t('mes.device.workshop'),
    },
    {
      component: 'ApiSelect',
      componentProps: selectProps(optionsOf('line')),
      dependencies: {
        resolve: ({ values }) => ({
          componentProps: { params: { workshopId: values.workshopId } },
          disabled: !values.workshopId,
        }),
        triggerFields: ['workshopId'],
      },
      fieldName: 'lineId',
      label: $t('mes.device.line'),
    },
    {
      component: 'ApiSelect',
      componentProps: selectProps(optionsOf('station')),
      dependencies: {
        resolve: ({ values }) => ({
          componentProps: { params: { lineId: values.lineId } },
          disabled: !values.lineId,
        }),
        triggerFields: ['lineId'],
      },
      fieldName: 'stationId',
      label: $t('mes.device.station'),
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
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}

/** 加载表单中依赖字典的选项 */
export async function loadFormOptions() {
  return { status: await getDictOptions(DictType.NORMAL_DISABLE) };
}
