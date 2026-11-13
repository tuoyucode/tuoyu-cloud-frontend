import type { MaterialApi } from '@tuoyu/shared/api/mes/material';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 查询条件：一行最多 4 个，多余的折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'materialCode',
      label: $t('mes.material.materialCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'materialName',
      label: $t('mes.material.materialName'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: enumOptions('MaterialType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'materialType',
      label: $t('mes.material.materialType'),
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
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: enumOptions('TraceMode'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'traceMode',
      label: $t('mes.material.traceMode'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<MaterialApi.Material>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'materialCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.material.materialCode'),
    },
    {
      field: 'materialName',
      minWidth: 160,
      title: $t('mes.material.materialName'),
    },
    {
      field: 'specification',
      minWidth: 140,
      title: $t('mes.material.specification'),
    },
    {
      field: 'materialType',
      slots: { default: 'materialType' },
      title: $t('mes.material.materialType'),
      width: 100,
    },
    { field: 'unit', title: $t('mes.material.unit'), width: 80 },
    {
      field: 'traceMode',
      slots: { default: 'traceMode' },
      title: $t('mes.material.traceMode'),
      width: 110,
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

/** 新增、编辑表单：两列，规格与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.material.materialCodePlaceholder'),
      },
      fieldName: 'materialCode',
      label: $t('mes.material.materialCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.material.materialNamePlaceholder'),
      },
      fieldName: 'materialName',
      label: $t('mes.material.materialName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 255,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'specification',
      formItemClass: 'md:col-span-2',
      label: $t('mes.material.specification'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: enumOptions('MaterialType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      defaultValue: 'raw',
      fieldName: 'materialType',
      label: $t('mes.material.materialType'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('mes.material.unitPlaceholder'),
      },
      fieldName: 'unit',
      label: $t('mes.material.unit'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: enumOptions('TraceMode'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      defaultValue: 'none',
      fieldName: 'traceMode',
      help: $t('mes.material.traceModeHelp'),
      label: $t('mes.material.traceMode'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        min: 0,
      },
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
