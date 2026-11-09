import type { StationApi } from '@tuoyu/shared/api/mes/station';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 启用的产线（下拉选项），可按车间过滤 */
async function lineOptions(params?: { workshopId?: string }) {
  return toSelectOptions(
    await getMesOptions('line', { workshopId: params?.workshopId }),
  );
}

/** 查询条件：一行最多 4 个，多余的折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () => toSelectOptions(await getMesOptions('workshop')),
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workshopId',
      label: $t('mes.station.workshop'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: lineOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      // 选了车间时只列出该车间的产线
      dependencies: {
        resolve: ({ values }) => ({
          componentProps: { params: { workshopId: values.workshopId } },
        }),
        triggerFields: ['workshopId'],
      },
      fieldName: 'lineId',
      label: $t('mes.station.line'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'stationCode',
      label: $t('mes.station.stationCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'stationName',
      label: $t('mes.station.stationName'),
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
export function useColumns(): VxeTableGridOptions<StationApi.Station>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'stationCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.station.stationCode'),
    },
    {
      field: 'stationName',
      minWidth: 160,
      title: $t('mes.station.stationName'),
    },
    {
      field: 'stationType',
      minWidth: 100,
      title: $t('mes.station.stationType'),
    },
    { field: 'lineName', minWidth: 120, title: $t('mes.station.line') },
    {
      field: 'workshopName',
      minWidth: 120,
      title: $t('mes.station.workshop'),
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

/** 新增、编辑表单：两列，备注占整行；所属车间与工厂由产线带出 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: lineOptions,
        class: 'w-full',
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'lineId',
      formItemClass: 'md:col-span-2',
      help: $t('mes.station.lineHelp'),
      label: $t('mes.station.line'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.station.stationCodePlaceholder'),
      },
      fieldName: 'stationCode',
      label: $t('mes.station.stationCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.station.stationNamePlaceholder'),
      },
      fieldName: 'stationName',
      label: $t('mes.station.stationName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('mes.station.stationTypePlaceholder'),
      },
      fieldName: 'stationType',
      label: $t('mes.station.stationType'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
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
