import type { SpelApi } from '@tuoyu/shared/api/workflow/spel';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

export { composeSpel } from '@tuoyu/shared/pages/workflow/spel';

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'componentName',
      label: $t('workflow.spel.componentName'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'methodName',
      label: $t('workflow.spel.methodName'),
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
export function useColumns(): VxeTableGridOptions<SpelApi.Spel>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      align: 'left',
      field: 'viewSpel',
      minWidth: 280,
      slots: { default: 'viewSpel' },
      title: $t('workflow.spel.viewSpel'),
    },
    {
      field: 'componentName',
      minWidth: 150,
      title: $t('workflow.spel.componentName'),
    },
    {
      field: 'methodName',
      minWidth: 150,
      title: $t('workflow.spel.methodName'),
    },
    {
      field: 'methodParams',
      minWidth: 140,
      title: $t('workflow.spel.methodParams'),
    },
    { field: 'remark', minWidth: 160, title: $t('crud.remark') },
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

/** 新增、编辑表单：两列，表达式与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 255,
        placeholder: 'spelRuleComponent',
      },
      fieldName: 'componentName',
      help: $t('workflow.spel.componentNameHelp'),
      label: $t('workflow.spel.componentName'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 255,
        placeholder: 'selectDeptLeaderById',
      },
      fieldName: 'methodName',
      label: $t('workflow.spel.methodName'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 255,
        placeholder: 'initiatorDeptId',
      },
      fieldName: 'methodParams',
      formItemClass: 'md:col-span-2',
      help: $t('workflow.spel.methodParamsHelp'),
      label: $t('workflow.spel.methodParams'),
    },
    {
      component: 'Input',
      componentProps: {
        class: 'font-mono',
        maxlength: 255,
        placeholder:
          '#{@spelRuleComponent.selectDeptLeaderById(#initiatorDeptId)}',
        rows: 2,
        showWordLimit: true,
        type: 'textarea',
      },
      fieldName: 'viewSpel',
      formItemClass: 'md:col-span-2',
      help: $t('workflow.spel.viewSpelHelp'),
      label: $t('workflow.spel.viewSpel'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      label: $t('crud.status'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 500,
        placeholder: $t('workflow.spel.remarkPlaceholder'),
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
