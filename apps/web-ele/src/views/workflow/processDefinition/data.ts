import type { DefinitionApi } from '@tuoyu/shared/api/workflow/definition';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getCategoryTree } from '@tuoyu/shared/api/workflow/category';

import { $t } from '#/locales';

export {
  ACTIVE,
  DEFINITION_PAGE_PATH,
  DESIGN_PAGE_PATH,
  designPath,
  exportFileName,
  PublishStatus,
  publishStatusKey,
} from '@tuoyu/shared/pages/workflow/processDefinition';
export type { PublishTab } from '@tuoyu/shared/pages/workflow/processDefinition';

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'flowCode',
      label: $t('workflow.processDefinition.flowCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'flowName',
      label: $t('workflow.processDefinition.flowName'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<DefinitionApi.Definition>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'flowCode',
      minWidth: 140,
      title: $t('workflow.processDefinition.flowCode'),
    },
    {
      field: 'flowName',
      minWidth: 160,
      title: $t('workflow.processDefinition.flowName'),
    },
    {
      field: 'categoryName',
      minWidth: 120,
      title: $t('workflow.common.category'),
    },
    {
      field: 'version',
      title: $t('workflow.processDefinition.version'),
      width: 80,
    },
    {
      field: 'isPublish',
      slots: { default: 'isPublish' },
      title: $t('workflow.processDefinition.publishStatus'),
      width: 100,
    },
    {
      field: 'activityStatus',
      slots: { default: 'activityStatus' },
      title: $t('workflow.processDefinition.activityStatus'),
      width: 100,
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 260,
    },
  ];
}

/** 新增、编辑表单：两列 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 40,
        placeholder: $t('workflow.processDefinition.flowCodePlaceholder'),
      },
      fieldName: 'flowCode',
      help: $t('workflow.processDefinition.flowCodeHelp'),
      label: $t('workflow.processDefinition.flowCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('workflow.processDefinition.flowNamePlaceholder'),
      },
      fieldName: 'flowName',
      label: $t('workflow.processDefinition.flowName'),
      rules: 'required',
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        api: getCategoryTree,
        // 任意一级分类都可以选，不只是末级
        checkStrictly: true,
        childrenField: 'children',
        class: 'w-full',
        defaultExpandAll: true,
        labelField: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        valueField: 'id',
      },
      fieldName: 'category',
      label: $t('workflow.common.category'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          {
            label: $t('workflow.processDefinition.modelClassics'),
            value: 'CLASSICS',
          },
          {
            label: $t('workflow.processDefinition.modelMimic'),
            value: 'MIMIC',
          },
        ],
      },
      defaultValue: 'CLASSICS',
      fieldName: 'modelValue',
      help: $t('workflow.processDefinition.modelValueHelp'),
      label: $t('workflow.processDefinition.modelValue'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: $t('workflow.processDefinition.formCustomN'), value: 'N' },
          { label: $t('workflow.processDefinition.formCustomY'), value: 'Y' },
        ],
      },
      defaultValue: 'N',
      fieldName: 'formCustom',
      label: $t('workflow.processDefinition.formCustom'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('workflow.processDefinition.formPathPlaceholder'),
      },
      dependencies: {
        if: (values) => values.formCustom === 'Y',
        triggerFields: ['formCustom'],
      },
      fieldName: 'formPath',
      help: $t('workflow.processDefinition.formPathHelp'),
      label: $t('workflow.processDefinition.formPath'),
    },
  ];
}
