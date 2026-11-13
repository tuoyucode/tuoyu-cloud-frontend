import type { OperationTaskApi } from '@tuoyu/shared/api/mes/operationTask';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { listUserOptions } from '@tuoyu/shared/api/system/user';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';
import { formatQty, workshopOptions } from '#/views/mes/workorder/data';

/** 可选择的用户（只要求登录的选项接口，不含联系方式），最多取前 200 个，下拉中按昵称或账号筛选 */
export async function userOptions() {
  const page = await listUserOptions({ page: 1, pageSize: 200 });
  return page.items.map((user) => ({
    label: `${user.nickName} (${user.userName})`,
    value: user.userId,
  }));
}

/** 查询条件：第一行 4 个，其余折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'workorderCode',
      label: $t('mes.operationTask.workorderCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'operationName',
      label: $t('mes.operationTask.operationName'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('TaskStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'taskStatus',
      label: $t('mes.operationTask.status'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: workshopOptions,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workshopId',
      label: $t('mes.operationTask.workshop'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () => toSelectOptions(await getMesOptions('team')),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'teamId',
      label: $t('mes.operationTask.team'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: userOptions,
        optionFilterProp: 'label',
        placeholder: $t('mes.operationTask.searchUser'),
        showSearch: true,
      },
      fieldName: 'assigneeUserId',
      label: $t('mes.operationTask.assignee'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<OperationTaskApi.Task>['columns'] {
  return [
    {
      field: 'taskCode',
      fixed: 'left',
      minWidth: 150,
      sortable: true,
      title: $t('mes.operationTask.taskCode'),
    },
    {
      field: 'workorderCode',
      minWidth: 150,
      title: $t('mes.operationTask.workorderCode'),
    },
    {
      field: 'seqNo',
      sortable: true,
      title: $t('mes.operationTask.seqNo'),
      width: 90,
    },
    {
      field: 'operationName',
      minWidth: 120,
      title: $t('mes.operationTask.operationName'),
    },
    {
      field: 'taskStatus',
      slots: { default: 'status' },
      title: $t('mes.operationTask.status'),
      width: 100,
    },
    {
      field: 'materialName',
      formatter: ({ row }) =>
        [row.materialCode, row.materialName].filter(Boolean).join(' '),
      minWidth: 160,
      title: $t('mes.operationTask.material'),
    },
    {
      align: 'right',
      field: 'planQty',
      formatter: ({ row }) => formatQty(row.planQty),
      title: $t('mes.operationTask.planQty'),
      width: 100,
    },
    {
      align: 'right',
      field: 'qualifiedQty',
      formatter: ({ row }) => formatQty(row.qualifiedQty),
      title: $t('mes.operationTask.qualifiedQty'),
      width: 90,
    },
    {
      align: 'right',
      field: 'defectQty',
      formatter: ({ row }) => formatQty(row.defectQty),
      title: $t('mes.operationTask.defectQty'),
      width: 90,
    },
    {
      align: 'right',
      field: 'availableQty',
      formatter: ({ row }) => formatQty(row.availableQty),
      title: $t('mes.operationTask.availableQty'),
      width: 90,
    },
    {
      field: 'firstInspection',
      formatter: ({ row }) =>
        row.firstInspection === 'Y'
          ? $t('mes.operationTask.firstInspectionRequired')
          : '',
      title: $t('mes.operationTask.firstInspection'),
      width: 100,
    },
    {
      field: 'workshopName',
      minWidth: 110,
      title: $t('mes.operationTask.workshop'),
    },
    {
      field: 'stationName',
      minWidth: 110,
      title: $t('mes.operationTask.station'),
    },
    {
      field: 'teamName',
      minWidth: 100,
      title: $t('mes.operationTask.team'),
    },
    {
      field: 'assigneeUserName',
      minWidth: 100,
      title: $t('mes.operationTask.assignee'),
    },
    {
      field: 'actualStartTime',
      title: $t('mes.operationTask.actualStartTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 200,
    },
  ];
}

/** 派工表单：工位随产线、班组随车间 */
export function useDispatchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        api: async (params: Record<string, string | undefined>) =>
          toSelectOptions(await getMesOptions('station', params)),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'stationId',
      label: $t('mes.operationTask.station'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        api: async (params: Record<string, string | undefined>) =>
          toSelectOptions(await getMesOptions('team', params)),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'teamId',
      label: $t('mes.operationTask.team'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        api: userOptions,
        optionFilterProp: 'label',
        placeholder: $t('mes.operationTask.searchUser'),
        showSearch: true,
      },
      fieldName: 'assigneeUserId',
      label: $t('mes.operationTask.assignee'),
    },
  ];
}
