import type { LocationApi } from '@tuoyu/shared/api/mes/location';
import type { WarehouseApi } from '@tuoyu/shared/api/mes/warehouse';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 启用的工厂（下拉选项） */
async function factoryOptions() {
  return toSelectOptions(await getMesOptions('factory'));
}

function statusSearch(): VbenFormSchema {
  return {
    component: 'ApiSelect',
    componentProps: {
      allowClear: true,
      api: () => getDictOptions(DictType.NORMAL_DISABLE),
      placeholder: $t('crud.selectPlaceholder'),
    },
    fieldName: 'status',
    label: $t('crud.status'),
  };
}

function sortField(): VbenFormSchema {
  return {
    component: 'InputNumber',
    componentProps: { class: 'w-full', min: 0 },
    defaultValue: 0,
    fieldName: 'sortNo',
    label: $t('crud.sort'),
  };
}

function statusField(): VbenFormSchema {
  return {
    component: 'RadioGroup',
    // 选项在抽屉打开时从字典加载
    componentProps: { options: [] },
    defaultValue: '0',
    fieldName: 'status',
    label: $t('crud.status'),
  };
}

function remarkField(): VbenFormSchema {
  return {
    component: 'Textarea',
    componentProps: {
      maxlength: 500,
      placeholder: $t('crud.remarkPlaceholder'),
      rows: 3,
    },
    fieldName: 'remark',
    formItemClass: 'md:col-span-2',
    label: $t('crud.remark'),
  };
}

/** 仓库的查询条件（左栏较窄，一行两个，多余的折叠） */
export function useWarehouseSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'warehouseName',
      label: $t('mes.warehouse.warehouseName'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('WarehouseType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'warehouseType',
      label: $t('mes.warehouse.warehouseType'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: factoryOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'factoryId',
      label: $t('mes.warehouse.factory'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'warehouseCode',
      label: $t('mes.warehouse.warehouseCode'),
    },
    statusSearch(),
  ];
}

/** 仓库表格列 */
export function useWarehouseColumns(): VxeTableGridOptions<WarehouseApi.Warehouse>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'warehouseCode',
      minWidth: 110,
      sortable: true,
      title: $t('mes.warehouse.warehouseCode'),
    },
    {
      field: 'warehouseName',
      minWidth: 140,
      title: $t('mes.warehouse.warehouseName'),
    },
    {
      field: 'warehouseType',
      slots: { default: 'warehouseType' },
      title: $t('mes.warehouse.warehouseType'),
      width: 110,
    },
    {
      field: 'factoryName',
      minWidth: 120,
      title: $t('mes.warehouse.factory'),
    },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 90,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 130,
    },
  ];
}

/** 仓库的新增、编辑表单 */
export function useWarehouseFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: factoryOptions,
        class: 'w-full',
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'factoryId',
      label: $t('mes.warehouse.factory'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: enumOptions('WarehouseType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      defaultValue: 'raw',
      fieldName: 'warehouseType',
      help: $t('mes.warehouse.warehouseTypeHelp'),
      label: $t('mes.warehouse.warehouseType'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.warehouse.warehouseCodePlaceholder'),
      },
      fieldName: 'warehouseCode',
      label: $t('mes.warehouse.warehouseCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.warehouse.warehouseNamePlaceholder'),
      },
      fieldName: 'warehouseName',
      label: $t('mes.warehouse.warehouseName'),
      rules: 'required',
    },
    sortField(),
    statusField(),
    remarkField(),
  ];
}

/** 库位的查询条件 */
export function useLocationSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'locationCode',
      label: $t('mes.warehouse.location.locationCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'locationName',
      label: $t('mes.warehouse.location.locationName'),
    },
  ];
}

/** 库位表格列 */
export function useLocationColumns(): VxeTableGridOptions<LocationApi.Location>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'locationCode',
      minWidth: 110,
      sortable: true,
      title: $t('mes.warehouse.location.locationCode'),
    },
    {
      field: 'locationName',
      minWidth: 140,
      title: $t('mes.warehouse.location.locationName'),
    },
    { field: 'sortNo', title: $t('crud.sort'), width: 90 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 90,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 130,
    },
  ];
}

/** 库位的新增、编辑表单；所属仓库为左侧选中的仓库，不在表单中修改 */
export function useLocationFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'warehouseName',
      formItemClass: 'md:col-span-2',
      label: $t('mes.warehouse.location.warehouse'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.warehouse.location.locationCodePlaceholder'),
      },
      fieldName: 'locationCode',
      help: $t('mes.warehouse.location.locationCodeHelp'),
      label: $t('mes.warehouse.location.locationCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.warehouse.location.locationNamePlaceholder'),
      },
      fieldName: 'locationName',
      label: $t('mes.warehouse.location.locationName'),
      rules: 'required',
    },
    sortField(),
    statusField(),
    remarkField(),
  ];
}

/** 加载表单中依赖字典的选项 */
export async function loadFormOptions() {
  return { status: await getDictOptions(DictType.NORMAL_DISABLE) };
}
