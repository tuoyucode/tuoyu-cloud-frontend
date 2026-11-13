import type { WorkorderApi } from '@tuoyu/shared/api/mes/workorder';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { trimDecimal } from '@tuoyu/shared/pages/mes/decimal';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 填写原因后执行的状态动作（暂停、取消、关闭工单，撤销报工），作为 reason-modal 的打开参数 */
export interface ReasonModalData {
  /** 输入框上方的说明，可为空 */
  description?: string;
  /** 输入框的标签 */
  label: string;
  /** 确认按钮的文字（写清动作，例如“暂停工单”） */
  okText: string;
  required: boolean;
  /** 提交原因；成功后关闭对话框并触发 success */
  submit: (reason: string) => Promise<unknown>;
  title: string;
}

/** 数量的显示：去掉后端返回的多余小数位 0 */
export function formatQty(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return String(Number(value));
}

/** 产品（成品、半成品）选项 */
export async function productOptions() {
  return toSelectOptions(
    await getMesOptions('material', { materialType: 'product,semi' }),
  );
}

export async function workshopOptions() {
  return toSelectOptions(await getMesOptions('workshop'));
}

/** 查询条件：第一行 4 个，其余折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'workorderCode',
      label: $t('mes.workorder.workorderCode'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: productOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'materialId',
      label: $t('mes.workorder.material'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: workshopOptions,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workshopId',
      label: $t('mes.workorder.workshop'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('WorkorderStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workorderStatus',
      label: $t('mes.workorder.status'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'planStartRange',
      label: $t('mes.workorder.planStartTime'),
    },
  ];
}

/** 查询表单的值转为后端的查询条件：计划开始时间按整天转为起止时间 */
export function toQuery(values: Record<string, any>): WorkorderApi.Query {
  const { planStartRange, ...rest } = values;
  const query: WorkorderApi.Query = { ...rest };
  if (Array.isArray(planStartRange) && planStartRange.length === 2) {
    query.beginPlanStartTime = `${planStartRange[0]} 00:00:00`;
    query.endPlanStartTime = `${planStartRange[1]} 23:59:59`;
  }
  return query;
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<WorkorderApi.Workorder>['columns'] {
  return [
    { fixed: 'left', type: 'checkbox', width: 48 },
    {
      field: 'workorderCode',
      fixed: 'left',
      minWidth: 160,
      slots: { default: 'workorderCode' },
      sortable: true,
      title: $t('mes.workorder.workorderCode'),
    },
    {
      field: 'workorderStatus',
      slots: { default: 'status' },
      title: $t('mes.workorder.status'),
      width: 100,
    },
    {
      field: 'materialName',
      formatter: ({ row }) =>
        [row.materialCode, row.materialName].filter(Boolean).join(' '),
      minWidth: 180,
      title: $t('mes.workorder.material'),
    },
    {
      align: 'right',
      field: 'planQty',
      formatter: ({ row }) => `${formatQty(row.planQty)} ${row.unit ?? ''}`,
      sortable: true,
      title: $t('mes.workorder.planQty'),
      width: 120,
    },
    {
      field: 'completionRate',
      slots: { default: 'progress' },
      title: $t('mes.workorder.completionRate'),
      width: 160,
    },
    {
      align: 'right',
      field: 'defectQty',
      formatter: ({ row }) => formatQty(row.defectQty),
      title: $t('mes.workorder.defectQty'),
      width: 100,
    },
    {
      field: 'workshopName',
      minWidth: 120,
      title: $t('mes.workorder.workshop'),
    },
    { field: 'lineName', minWidth: 100, title: $t('mes.workorder.line') },
    {
      field: 'batchCode',
      minWidth: 120,
      title: $t('mes.workorder.batchCode'),
    },
    {
      field: 'priority',
      sortable: true,
      title: $t('mes.workorder.priority'),
      width: 90,
    },
    {
      field: 'planStartTime',
      sortable: true,
      title: $t('mes.workorder.planStartTime'),
      width: 170,
    },
    {
      field: 'planEndTime',
      sortable: true,
      title: $t('mes.workorder.planEndTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 220,
    },
  ];
}

/** 新增、编辑表单：两列；工艺路线、物料清单随产品，产线随车间 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: $t('mes.workorder.workorderCodeAuto'),
      },
      fieldName: 'workorderCode',
      label: $t('mes.workorder.workorderCode'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: enumOptions('WorkorderSource'),
      },
      defaultValue: 'manual',
      fieldName: 'sourceType',
      label: $t('mes.workorder.sourceType'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: productOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'materialId',
      label: $t('mes.workorder.material'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: async (params: Record<string, string | undefined>) =>
          params.materialId
            ? toSelectOptions(await getMesOptions('route', params))
            : [],
        placeholder: $t('crud.selectPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          disabled: !values.materialId,
          params: { materialId: values.materialId },
        }),
        triggerFields: ['materialId'],
      },
      fieldName: 'routeId',
      label: $t('mes.workorder.route'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        api: async (params: Record<string, string | undefined>) =>
          params.materialId
            ? toSelectOptions(await getMesOptions('bom', params))
            : [],
        placeholder: $t('mes.workorder.bomPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          disabled: !values.materialId,
          params: { materialId: values.materialId },
        }),
        triggerFields: ['materialId'],
      },
      fieldName: 'bomId',
      label: $t('mes.workorder.bom'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 0.000001,
        formatter: trimDecimal,
        precision: 6,
      },
      fieldName: 'planQty',
      label: $t('mes.workorder.planQty'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: workshopOptions,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workshopId',
      label: $t('mes.workorder.workshop'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        api: async (params: Record<string, string | undefined>) =>
          params.workshopId
            ? toSelectOptions(await getMesOptions('line', params))
            : [],
        placeholder: $t('crud.selectPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          disabled: !values.workshopId,
          params: { workshopId: values.workshopId },
        }),
        triggerFields: ['workshopId'],
      },
      fieldName: 'lineId',
      label: $t('mes.workorder.line'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'planStartTime',
      label: $t('mes.workorder.planStartTime'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'planEndTime',
      label: $t('mes.workorder.planEndTime'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', max: 999, min: 0, precision: 0 },
      defaultValue: 0,
      fieldName: 'priority',
      help: $t('mes.workorder.priorityHelp'),
      label: $t('mes.workorder.priority'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.workorder.sourceCodePlaceholder'),
      },
      fieldName: 'sourceCode',
      label: $t('mes.workorder.sourceCode'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}
