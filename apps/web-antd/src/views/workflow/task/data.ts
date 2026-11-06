import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { InstanceApi } from '#/api/workflow/instance';
import type { TaskApi } from '#/api/workflow/task';

import { DictType } from '#/api/system/dict';
import { getCategoryTree } from '#/api/workflow/category';
import { $t } from '#/locales';

/** 任务列表的查询条件：一行最多 4 个 */
export function useTaskSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'flowName',
      label: $t('workflow.common.flowName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'nodeName',
      label: $t('workflow.common.nodeName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'flowCode',
      label: $t('workflow.common.flowCode'),
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        allowClear: true,
        api: getCategoryTree,
        childrenField: 'children',
        labelField: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        treeDefaultExpandAll: true,
        valueField: 'id',
      },
      fieldName: 'category',
      label: $t('workflow.common.category'),
    },
  ];
}

/** 流程实例（我发起的、流程实例）的查询条件 */
export function useInstanceSearchSchema(withCategory = true): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'flowName',
      label: $t('workflow.common.flowName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'flowCode',
      label: $t('workflow.common.flowCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'businessId',
      label: $t('workflow.common.businessId'),
    },
  ];
  if (withCategory) {
    schema.push(useTaskSearchSchema()[3] as VbenFormSchema);
  }
  return schema;
}

const businessColumn = {
  field: 'businessTitle',
  formatter: ({ row }: { row: Record<string, any> }) =>
    row.businessTitle || row.businessCode || row.businessId,
  minWidth: 160,
  title: $t('workflow.common.business'),
};

function actionsColumn(width: number) {
  return {
    align: 'right' as const,
    field: 'actions',
    fixed: 'right' as const,
    slots: { default: 'actions' },
    title: $t('crud.actions'),
    width,
  };
}

/** 待办任务（我的待办、全部待办）的表格列 */
export function useWaitingColumns(
  options: { assignee?: boolean; checkbox?: boolean } = {},
): VxeTableGridOptions<TaskApi.Task>['columns'] {
  return [
    ...(options.checkbox ? [{ type: 'checkbox' as const, width: 48 }] : []),
    {
      field: 'flowName',
      minWidth: 140,
      title: $t('workflow.common.flowName'),
    },
    businessColumn,
    {
      field: 'nodeName',
      minWidth: 120,
      title: $t('workflow.common.currentNode'),
    },
    ...(options.assignee
      ? [
          {
            field: 'assigneeNames',
            minWidth: 140,
            title: $t('workflow.common.assignee'),
          },
        ]
      : []),
    {
      field: 'createByName',
      minWidth: 100,
      title: $t('workflow.common.applicant'),
    },
    {
      field: 'categoryName',
      minWidth: 100,
      title: $t('workflow.common.category'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.WF_BUSINESS_STATUS },
      },
      field: 'flowStatus',
      title: $t('workflow.common.flowStatus'),
      width: 100,
    },
    {
      field: 'createTime',
      title: $t('workflow.common.arriveTime'),
      width: 170,
    },
    actionsColumn(options.assignee ? 220 : 100),
  ];
}

/** 已办任务（我的已办、全部已办）的表格列 */
export function useFinishedColumns(): VxeTableGridOptions<TaskApi.HisTask>['columns'] {
  return [
    {
      field: 'flowName',
      minWidth: 140,
      title: $t('workflow.common.flowName'),
    },
    businessColumn,
    {
      field: 'nodeName',
      minWidth: 120,
      title: $t('workflow.common.nodeName'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.WF_TASK_STATUS },
      },
      field: 'flowStatus',
      title: $t('workflow.common.result'),
      width: 90,
    },
    {
      field: 'approverName',
      minWidth: 100,
      title: $t('workflow.common.approver'),
    },
    {
      field: 'createByName',
      minWidth: 100,
      title: $t('workflow.common.applicant'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.WF_BUSINESS_STATUS },
      },
      field: 'flowTaskStatus',
      title: $t('workflow.common.flowStatus'),
      width: 100,
    },
    {
      field: 'runDuration',
      minWidth: 110,
      title: $t('workflow.common.runDuration'),
    },
    {
      field: 'updateTime',
      title: $t('workflow.common.handleTime'),
      width: 170,
    },
    actionsColumn(100),
  ];
}

/** 抄送的表格列 */
export function useCopyColumns(): VxeTableGridOptions<TaskApi.Task>['columns'] {
  return [
    {
      field: 'flowName',
      minWidth: 140,
      title: $t('workflow.common.flowName'),
    },
    businessColumn,
    {
      field: 'nodeName',
      minWidth: 120,
      title: $t('workflow.common.copyNode'),
    },
    {
      field: 'createByName',
      minWidth: 100,
      title: $t('workflow.common.applicant'),
    },
    {
      field: 'processedByName',
      minWidth: 100,
      title: $t('workflow.common.copyUser'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.WF_BUSINESS_STATUS },
      },
      field: 'flowStatus',
      title: $t('workflow.common.flowStatus'),
      width: 100,
    },
    { field: 'createTime', title: $t('workflow.common.copyTime'), width: 170 },
    actionsColumn(100),
  ];
}

/** 流程实例（我发起的、流程实例）的表格列 */
export function useInstanceColumns(
  options: { activity?: boolean; applicant?: boolean; checkbox?: boolean } = {},
): VxeTableGridOptions<InstanceApi.Instance>['columns'] {
  return [
    ...(options.checkbox ? [{ type: 'checkbox' as const, width: 48 }] : []),
    {
      field: 'flowName',
      minWidth: 140,
      title: $t('workflow.common.flowName'),
    },
    businessColumn,
    {
      field: 'nodeName',
      minWidth: 120,
      title: $t('workflow.common.currentNode'),
    },
    ...(options.applicant
      ? [
          {
            field: 'createByName',
            minWidth: 100,
            title: $t('workflow.common.applicant'),
          },
        ]
      : []),
    {
      field: 'categoryName',
      minWidth: 100,
      title: $t('workflow.common.category'),
    },
    {
      field: 'version',
      title: $t('workflow.common.version'),
      width: 70,
    },
    ...(options.activity
      ? [
          {
            field: 'activityStatus',
            slots: { default: 'activityStatus' },
            title: $t('workflow.common.activityStatus'),
            width: 100,
          },
        ]
      : []),
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.WF_BUSINESS_STATUS },
      },
      field: 'flowStatus',
      title: $t('workflow.common.flowStatus'),
      width: 100,
    },
    {
      field: 'createTime',
      title: $t('workflow.common.startTime'),
      width: 170,
    },
    actionsColumn(options.activity ? 240 : 180),
  ];
}
