import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';

import { $t } from '#/locales';
import { enumOptions } from '#/views/mes/_shared/enums';

/** 领料、补料只允许这些状态的工单；退料另外允许已完工 */
const ISSUE_WORKORDER_STATUSES = 'released,in_progress,paused';
const RETURN_WORKORDER_STATUSES = 'released,in_progress,paused,completed';

/** 可领退料的工单（最近 50 个，按状态过滤） */
export async function loadWorkorderOptions(params: { statuses?: string }) {
  return toSelectOptions(await getMesOptions('workorder', params));
}

/** 启用的仓库 */
export async function loadWarehouseOptions(params: { warehouseType?: string }) {
  return toSelectOptions(await getMesOptions('warehouse', params));
}

/** 仓库下的库位；未选仓库时为空 */
export async function loadLocationOptions(params: { warehouseId?: string }) {
  if (!params.warehouseId) {
    return [];
  }
  return toSelectOptions(await getMesOptions('location', params));
}

/** 工单下拉的状态过滤：退料允许已完工的工单 */
export function workorderStatusesFor(requestType?: string) {
  return requestType === 'return'
    ? RETURN_WORKORDER_STATUSES
    : ISSUE_WORKORDER_STATUSES;
}

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'requestCode',
      label: $t('mes.materialRequest.requestCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('MaterialRequestType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'requestType',
      label: $t('mes.materialRequest.requestType'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'workorderCode',
      label: $t('mes.materialRequest.workorderCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('MaterialRequestStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'requestStatus',
      label: $t('mes.materialRequest.requestStatus'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<MaterialRequestApi.Request>['columns'] {
  return [
    {
      field: 'requestCode',
      minWidth: 160,
      sortable: true,
      title: $t('mes.materialRequest.requestCode'),
    },
    {
      field: 'requestType',
      slots: { default: 'requestType' },
      title: $t('mes.materialRequest.requestType'),
      width: 90,
    },
    {
      field: 'workorderCode',
      minWidth: 150,
      title: $t('mes.materialRequest.workorderCode'),
    },
    {
      field: 'productName',
      minWidth: 140,
      title: $t('mes.materialRequest.productName'),
    },
    {
      field: 'warehouseName',
      minWidth: 120,
      title: $t('mes.materialRequest.warehouse'),
    },
    {
      field: 'requestStatus',
      slots: { default: 'requestStatus' },
      title: $t('mes.materialRequest.requestStatus'),
      width: 100,
    },
    {
      field: 'operatorUserName',
      minWidth: 100,
      title: $t('mes.materialRequest.operator'),
    },
    {
      field: 'completeTime',
      title: $t('mes.materialRequest.completeTime'),
      width: 170,
    },
    {
      field: 'createTime',
      sortable: true,
      title: $t('crud.createTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 280,
    },
  ];
}

/** 新增、编辑抽屉的表头字段：两列，备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: enumOptions('MaterialRequestType'),
      },
      defaultValue: 'issue',
      // 新增后不能修改单据类型：编辑时由抽屉禁用
      fieldName: 'requestType',
      formItemClass: 'md:col-span-2',
      label: $t('mes.materialRequest.requestType'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: loadWorkorderOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      dependencies: {
        componentProps: (values) => ({
          params: { statuses: workorderStatusesFor(values.requestType) },
        }),
        triggerFields: ['requestType'],
      },
      fieldName: 'workorderId',
      label: $t('mes.materialRequest.workorder'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: loadWarehouseOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'warehouseId',
      label: $t('mes.materialRequest.warehouse'),
      rules: 'selectRequired',
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

/** 按物料清单生成领料单的表单 */
export function useGenerateSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: loadWorkorderOptions,
        optionFilterProp: 'label',
        params: { statuses: ISSUE_WORKORDER_STATUSES },
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workorderId',
      label: $t('mes.materialRequest.workorder'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: loadWarehouseOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'warehouseId',
      label: $t('mes.materialRequest.warehouse'),
      rules: 'selectRequired',
    },
  ];
}

/** 数量显示：去掉多余的 0 */
export function formatQty(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return String(Number(value));
}
