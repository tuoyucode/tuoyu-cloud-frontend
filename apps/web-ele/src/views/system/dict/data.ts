import type { DictApi } from '@tuoyu/shared/api/system/dict';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import {
  DICT_TYPE_PATTERN,
  LIST_CLASSES,
} from '@tuoyu/shared/pages/system/dict';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/** Element Plus 标签的类型 */
export type ListClassTagType =
  | 'danger'
  | 'info'
  | 'primary'
  | 'success'
  | 'warning';

/**
 * 字典数据的回显样式（listClass）对应的标签类型，与字典标签组件的显示一致；
 * 未设置或未知的样式显示为中性色
 */
export const LIST_CLASS_TYPES: Record<string, ListClassTagType> = {
  danger: 'danger',
  default: 'info',
  info: 'info',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
};

/* ---------------------------- 字典类型 ---------------------------- */

/** 字典类型的查询条件：左栏较窄，一行 2 个 */
export function useTypeSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'dictName',
      label: $t('system.dict.dictName'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'dictType',
      label: $t('system.dict.dictType'),
    },
  ];
}

/** 字典类型的表格列 */
export function useTypeColumns(): VxeTableGridOptions<DictApi.DictTypeItem>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    { field: 'dictName', minWidth: 120, title: $t('system.dict.dictName') },
    {
      className: 'font-mono',
      field: 'dictType',
      minWidth: 160,
      title: $t('system.dict.dictType'),
    },
    {
      field: 'remark',
      minWidth: 120,
      showOverflow: 'tooltip',
      title: $t('crud.remark'),
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

/** 字典类型的新增、编辑表单 */
export function useTypeFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.dict.dictNamePlaceholder'),
      },
      fieldName: 'dictName',
      label: $t('system.dict.dictName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        class: 'font-mono',
        maxlength: 100,
        placeholder: $t('system.dict.dictTypePlaceholder'),
      },
      fieldName: 'dictType',
      help: $t('system.dict.dictTypeHelp'),
      label: $t('system.dict.dictType'),
      rules: z
        .string({ message: $t('system.dict.dictTypeRequired') })
        .min(1, { message: $t('system.dict.dictTypeRequired') })
        .regex(DICT_TYPE_PATTERN, {
          message: $t('system.dict.dictTypeInvalid'),
        }),
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

/* ---------------------------- 字典数据 ---------------------------- */

/** 字典数据的查询条件 */
export function useDataSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'dictLabel',
      label: $t('system.dict.dictLabel'),
    },
  ];
}

/** 字典数据的表格列 */
export function useDataColumns(): VxeTableGridOptions<DictApi.DictData>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'dictLabel',
      minWidth: 120,
      slots: { default: 'dictLabel' },
      title: $t('system.dict.dictLabel'),
    },
    {
      className: 'font-mono',
      field: 'dictValue',
      minWidth: 100,
      title: $t('system.dict.dictValue'),
    },
    { field: 'dictSort', title: $t('crud.sort'), width: 90 },
    {
      cellRender: { name: 'CellDict', props: { dictType: DictType.YES_NO } },
      field: 'isDefault',
      title: $t('system.dict.isDefault'),
      width: 90,
    },
    {
      field: 'remark',
      minWidth: 120,
      showOverflow: 'tooltip',
      title: $t('crud.remark'),
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

/** 字典数据的新增、编辑表单：两列，备注占整行 */
export function useDataFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { class: 'font-mono', disabled: true },
      fieldName: 'dictType',
      formItemClass: 'md:col-span-2',
      label: $t('system.dict.dictType'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.dict.dictLabelPlaceholder'),
      },
      fieldName: 'dictLabel',
      label: $t('system.dict.dictLabel'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        class: 'font-mono',
        maxlength: 100,
        placeholder: $t('system.dict.dictValuePlaceholder'),
      },
      fieldName: 'dictValue',
      help: $t('system.dict.dictValueHelp'),
      label: $t('system.dict.dictValue'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        clearable: true,
        options: LIST_CLASSES.map((value) => ({
          label: $t(`system.dict.listClasses.${value}`),
          value,
        })),
        placeholder: $t('crud.selectPlaceholder'),
      },
      defaultValue: 'default',
      fieldName: 'listClass',
      help: $t('system.dict.listClassHelp'),
      label: $t('system.dict.listClass'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', controlsPosition: 'right', min: 0 },
      defaultValue: 0,
      fieldName: 'dictSort',
      label: $t('crud.sort'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: 'N',
      fieldName: 'isDefault',
      label: $t('system.dict.isDefault'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.dict.cssClassPlaceholder'),
      },
      fieldName: 'cssClass',
      label: $t('system.dict.cssClass'),
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

/** 加载字典数据表单中依赖字典的选项（单选框只需要文字与值） */
export async function loadDataFormOptions() {
  const isDefault = await getDictOptions(DictType.YES_NO);
  return {
    isDefault: isDefault.map(({ label, value }) => ({ label, value })),
  };
}
