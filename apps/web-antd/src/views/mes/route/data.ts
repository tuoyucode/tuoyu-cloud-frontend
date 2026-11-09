import type { RouteApi } from '@tuoyu/shared/api/mes/route';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { markRaw } from 'vue';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

import MaterialSelect from '../material/material-select.vue';

/** 能建立工艺路线的物料类型：成品、半成品 */
export const PRODUCT_TYPES = 'product,semi';

/** 是否（默认版本、首检） */
export const YES = 'Y';
export const NO = 'N';

/** 相邻工序顺序的默认间隔，便于以后在中间插入工序 */
export const SEQ_STEP = 10;

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: markRaw(MaterialSelect),
      componentProps: {
        materialType: PRODUCT_TYPES,
        placeholder: $t('mes.route.productPlaceholder'),
      },
      fieldName: 'materialId',
      label: $t('mes.route.product'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'routeCode',
      label: $t('mes.route.routeCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'routeName',
      label: $t('mes.route.routeName'),
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
export function useColumns(): VxeTableGridOptions<RouteApi.Route>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'routeCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.route.routeCode'),
    },
    { field: 'routeName', minWidth: 160, title: $t('mes.route.routeName') },
    { field: 'routeVersion', title: $t('mes.route.routeVersion'), width: 90 },
    {
      field: 'materialCode',
      minWidth: 120,
      title: $t('mes.route.productCode'),
    },
    {
      field: 'materialName',
      minWidth: 160,
      title: $t('mes.route.productName'),
    },
    {
      cellRender: { name: 'CellDict', props: { dictType: DictType.YES_NO } },
      field: 'isDefault',
      title: $t('mes.route.isDefault'),
      width: 100,
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

/** 表头表单：两列，备注占整行；工序在抽屉下方的表格中编辑 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: markRaw(MaterialSelect),
      // 编辑时由抽屉传入已选产品的显示文字（initialLabel）
      componentProps: {
        materialType: PRODUCT_TYPES,
        placeholder: $t('mes.route.productPlaceholder'),
      },
      fieldName: 'materialId',
      formItemClass: 'md:col-span-2',
      label: $t('mes.route.product'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.route.routeCodePlaceholder'),
      },
      fieldName: 'routeCode',
      label: $t('mes.route.routeCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.route.routeNamePlaceholder'),
      },
      fieldName: 'routeName',
      label: $t('mes.route.routeName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 32, placeholder: 'V1' },
      defaultValue: 'V1',
      fieldName: 'routeVersion',
      label: $t('mes.route.routeVersion'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: $t('mes.route.yes'), value: YES },
          { label: $t('mes.route.no'), value: NO },
        ],
      },
      defaultValue: NO,
      fieldName: 'isDefault',
      help: $t('mes.route.isDefaultHelp'),
      label: $t('mes.route.isDefault'),
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
        rows: 2,
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
