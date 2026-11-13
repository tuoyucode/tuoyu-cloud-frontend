import type { InspectionSchemeApi } from '@tuoyu/shared/api/mes/inspectionScheme';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { trimFixedDecimal } from '@tuoyu/shared/pages/mes/decimal';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 检验方案适用的产品：成品与半成品 */
async function loadProductOptions() {
  return toSelectOptions(
    await getMesOptions('material', { materialType: 'product,semi' }),
  );
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
      fieldName: 'schemeCode',
      label: $t('mes.inspectionScheme.schemeCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'schemeName',
      label: $t('mes.inspectionScheme.schemeName'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: enumOptions('InspectionType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'inspectionType',
      label: $t('mes.inspectionScheme.inspectionType'),
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
export function useColumns(): VxeTableGridOptions<InspectionSchemeApi.Scheme>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'schemeCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.inspectionScheme.schemeCode'),
    },
    {
      field: 'schemeName',
      minWidth: 160,
      title: $t('mes.inspectionScheme.schemeName'),
    },
    {
      field: 'inspectionType',
      slots: { default: 'inspectionType' },
      title: $t('mes.inspectionScheme.inspectionType'),
      width: 100,
    },
    {
      field: 'materialName',
      formatter: ({ cellValue }) =>
        cellValue || $t('mes.inspectionScheme.anyProduct'),
      minWidth: 140,
      title: $t('mes.inspectionScheme.material'),
    },
    {
      field: 'operationCode',
      formatter: ({ cellValue }) =>
        cellValue || $t('mes.inspectionScheme.anyOperation'),
      minWidth: 110,
      title: $t('mes.inspectionScheme.operationCode'),
    },
    {
      align: 'right',
      field: 'sampleQty',
      formatter: ({ cellValue }) =>
        cellValue === null || cellValue === undefined
          ? ''
          : String(Number(cellValue)),
      title: $t('mes.inspectionScheme.sampleQty'),
      width: 100,
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

/** 新增、编辑表单：两列，检验项目与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.inspectionScheme.schemeCodePlaceholder'),
      },
      fieldName: 'schemeCode',
      label: $t('mes.inspectionScheme.schemeCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.inspectionScheme.schemeNamePlaceholder'),
      },
      fieldName: 'schemeName',
      label: $t('mes.inspectionScheme.schemeName'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: enumOptions('InspectionType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'inspectionType',
      label: $t('mes.inspectionScheme.inspectionType'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        formatter: trimFixedDecimal(6),
        min: 0,
        precision: 6,
      },
      fieldName: 'sampleQty',
      label: $t('mes.inspectionScheme.sampleQty'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: loadProductOptions,
        class: 'w-full',
        clearable: true,
        filterable: true,
        placeholder: $t('mes.inspectionScheme.anyProduct'),
      },
      fieldName: 'materialId',
      help: $t('mes.inspectionScheme.materialHelp'),
      label: $t('mes.inspectionScheme.material'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.inspectionScheme.anyOperation'),
      },
      fieldName: 'operationCode',
      help: $t('mes.inspectionScheme.operationHelp'),
      label: $t('mes.inspectionScheme.operationCode'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 2000,
        placeholder: $t('mes.inspectionScheme.checkItemsPlaceholder'),
        rows: 6,
        showWordLimit: true,
        type: 'textarea',
      },
      fieldName: 'checkItems',
      formItemClass: 'md:col-span-2',
      label: $t('mes.inspectionScheme.checkItems'),
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

/** 加载表单中依赖字典的选项（单选框只需要文字与值） */
export async function loadFormOptions() {
  const status = await getDictOptions(DictType.NORMAL_DISABLE);
  return {
    status: status.map(({ label, value }) => ({ label, value })),
  };
}
