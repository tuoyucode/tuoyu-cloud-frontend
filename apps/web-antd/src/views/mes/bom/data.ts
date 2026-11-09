import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BomApi } from '#/api/mes/bom';

import { markRaw } from 'vue';

import { DictType, getDictOptions } from '#/api/system/dict';
import { $t } from '#/locales';

import MaterialSelect from '../material/material-select.vue';

/** 能建立物料清单的物料类型：成品、半成品 */
export const PRODUCT_TYPES = 'product,semi';

/** 是否默认版本 */
export const YES = 'Y';
export const NO = 'N';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: markRaw(MaterialSelect),
      componentProps: {
        materialType: PRODUCT_TYPES,
        placeholder: $t('mes.bom.productPlaceholder'),
      },
      fieldName: 'materialId',
      label: $t('mes.bom.product'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'bomCode',
      label: $t('mes.bom.bomCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'bomVersion',
      label: $t('mes.bom.bomVersion'),
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
export function useColumns(): VxeTableGridOptions<BomApi.Bom>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'bomCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.bom.bomCode'),
    },
    { field: 'bomVersion', title: $t('mes.bom.bomVersion'), width: 90 },
    {
      field: 'materialCode',
      minWidth: 120,
      title: $t('mes.bom.productCode'),
    },
    {
      field: 'materialName',
      minWidth: 160,
      title: $t('mes.bom.productName'),
    },
    {
      field: 'baseQty',
      formatter: ({ cellValue }) =>
        cellValue === undefined || cellValue === null ? '' : Number(cellValue),
      title: $t('mes.bom.baseQty'),
      width: 100,
    },
    { field: 'unit', title: $t('mes.bom.unit'), width: 80 },
    {
      cellRender: { name: 'CellDict', props: { dictType: DictType.YES_NO } },
      field: 'isDefault',
      title: $t('mes.bom.isDefault'),
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

/** 表头表单：两列，备注占整行；明细在抽屉下方的表格中编辑 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: markRaw(MaterialSelect),
      // 编辑时由抽屉传入已选产品的显示文字（initialLabel）
      componentProps: {
        materialType: PRODUCT_TYPES,
        placeholder: $t('mes.bom.productPlaceholder'),
      },
      fieldName: 'materialId',
      formItemClass: 'md:col-span-2',
      label: $t('mes.bom.product'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.bom.bomCodePlaceholder'),
      },
      fieldName: 'bomCode',
      label: $t('mes.bom.bomCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 32, placeholder: 'V1' },
      defaultValue: 'V1',
      fieldName: 'bomVersion',
      label: $t('mes.bom.bomVersion'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0.000001, precision: 6 },
      defaultValue: 1,
      fieldName: 'baseQty',
      help: $t('mes.bom.baseQtyHelp'),
      label: $t('mes.bom.baseQty'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: $t('mes.bom.yes'), value: YES },
          { label: $t('mes.bom.no'), value: NO },
        ],
      },
      defaultValue: NO,
      fieldName: 'isDefault',
      help: $t('mes.bom.isDefaultHelp'),
      label: $t('mes.bom.isDefault'),
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
