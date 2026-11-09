import type { DefinitionApi } from '@tuoyu/shared/api/workflow/definition';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getCategoryTree } from '@tuoyu/shared/api/workflow/category';

import { $t } from '#/locales';

/** 流程定义列表的路由 */
export const DEFINITION_PAGE_PATH = '/workflow/processDefinition';

/** 流程设计的路由（菜单“流程设计”，隐藏） */
export const DESIGN_PAGE_PATH = '/workflow/design/index';

/** 发布状态 */
export const PublishStatus = {
  EXPIRED: 9,
  PUBLISHED: 1,
  UNPUBLISHED: 0,
} as const;

/** 激活状态：1 激活，0 挂起 */
export const ACTIVE = 1;

/** 列表中显示的发布状态：已发布、未发布 */
export type PublishTab = 'published' | 'unpublished';

/** 设计页面的地址：已发布的流程只读查看 */
export function designPath(
  definition: Pick<DefinitionApi.Definition, 'id' | 'isPublish'>,
) {
  const disabled = definition.isPublish === PublishStatus.PUBLISHED;
  const query = new URLSearchParams({ definitionId: definition.id });
  if (disabled) {
    query.set('disabled', 'true');
  }
  return `${DESIGN_PAGE_PATH}?${query.toString()}`;
}

/** 发布状态的文案键 */
export function publishStatusKey(status?: number) {
  switch (status) {
    case PublishStatus.EXPIRED: {
      return 'workflow.processDefinition.expired';
    }
    case PublishStatus.PUBLISHED: {
      return 'workflow.processDefinition.published';
    }
    default: {
      return 'workflow.processDefinition.unpublished';
    }
  }
}

/** 导出的文件名：流程编码_版本.json */
export function exportFileName(
  definition: Pick<DefinitionApi.Definition, 'flowCode' | 'version'>,
) {
  const version = definition.version ? `_v${definition.version}` : '';
  return `${definition.flowCode}${version}.json`;
}

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'flowCode',
      label: $t('workflow.processDefinition.flowCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
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
        childrenField: 'children',
        labelField: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        treeDefaultExpandAll: true,
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
