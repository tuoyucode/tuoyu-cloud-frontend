import type { SpelApi } from '@tuoyu/shared/api/workflow/spel';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'componentName',
      label: $t('workflow.spel.componentName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'methodName',
      label: $t('workflow.spel.methodName'),
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
      component: 'Textarea',
      componentProps: {
        class: 'font-mono',
        maxlength: 255,
        placeholder:
          '#{@spelRuleComponent.selectDeptLeaderById(#initiatorDeptId)}',
        rows: 2,
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
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('workflow.spel.remarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}

/**
 * 由组件名、方法名、参数拼出 SpEL 表达式，例如
 * spelRuleComponent、selectDeptLeaderById、initiatorDeptId → #{@spelRuleComponent.selectDeptLeaderById(#initiatorDeptId)}
 * 只填了参数名时返回变量表达式 ${参数}；信息不足时返回 undefined
 */
export function composeSpel(
  componentName?: string,
  methodName?: string,
  methodParams?: string,
): string | undefined {
  const component = componentName?.trim();
  const method = methodName?.trim();
  const params = (methodParams ?? '')
    .split(',')
    .map((param) => param.trim())
    .filter(Boolean);
  if (component && method) {
    const args = params.map((param) => `#${param}`).join(',');
    return `#{@${component}.${method}(${args})}`;
  }
  if (!component && !method && params.length === 1) {
    return `\${${params[0]}}`;
  }
  return undefined;
}
