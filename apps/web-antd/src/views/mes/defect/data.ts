import type { DefectApi } from '@tuoyu/shared/api/mes/defect';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { trimDecimal } from '@tuoyu/shared/pages/mes/decimal';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 可以登记不良的工单：已下达、生产中、已暂停、已完工 */
async function loadWorkorderOptions() {
  return toSelectOptions(
    await getMesOptions('workorder', {
      statuses: 'released,in_progress,paused,completed',
    }),
  );
}

/** 工单的工序任务；未选工单时为空 */
async function loadTaskOptions(params: { workorderId?: string }) {
  if (!params.workorderId) {
    return [];
  }
  return toSelectOptions(await getMesOptions('operation-task', params));
}

/** 查询条件：一行 4 个，多余的折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'defectCode',
      label: $t('mes.defect.defectCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'workorderCode',
      label: $t('mes.defect.workorderCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('DefectHandleStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'handleStatus',
      label: $t('mes.defect.handleStatus'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('DefectLevel'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'defectLevel',
      label: $t('mes.defect.defectLevel'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('DefectSource'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'sourceType',
      label: $t('mes.defect.sourceType'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<DefectApi.Defect>['columns'] {
  return [
    {
      field: 'defectCode',
      minWidth: 160,
      sortable: true,
      title: $t('mes.defect.defectCode'),
    },
    {
      field: 'sourceType',
      slots: { default: 'sourceType' },
      title: $t('mes.defect.sourceType'),
      width: 100,
    },
    {
      field: 'sourceCode',
      minWidth: 150,
      title: $t('mes.defect.sourceCode'),
    },
    {
      field: 'workorderCode',
      minWidth: 150,
      title: $t('mes.defect.workorderCode'),
    },
    {
      field: 'operationName',
      minWidth: 110,
      title: $t('mes.defect.operation'),
    },
    {
      field: 'materialName',
      minWidth: 130,
      title: $t('mes.defect.product'),
    },
    {
      align: 'right',
      field: 'defectQty',
      formatter: ({ cellValue }) =>
        cellValue === null || cellValue === undefined
          ? ''
          : String(Number(cellValue)),
      title: $t('mes.defect.defectQty'),
      width: 90,
    },
    {
      field: 'defectLevel',
      slots: { default: 'defectLevel' },
      title: $t('mes.defect.defectLevel'),
      width: 90,
    },
    {
      field: 'description',
      minWidth: 180,
      showOverflow: true,
      title: $t('mes.defect.description'),
    },
    {
      field: 'handleStatus',
      slots: { default: 'handleStatus' },
      title: $t('mes.defect.handleStatus'),
      width: 90,
    },
    {
      field: 'handleMethod',
      slots: { default: 'handleMethod' },
      title: $t('mes.defect.handleMethod'),
      width: 100,
    },
    {
      field: 'handleUserName',
      minWidth: 100,
      title: $t('mes.defect.handleUser'),
    },
    {
      field: 'handleTime',
      title: $t('mes.defect.handleTime'),
      width: 170,
    },
    {
      field: 'createTime',
      sortable: true,
      title: $t('mes.defect.createTime'),
      width: 170,
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

/** 手工登记不良：两列，描述与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: loadWorkorderOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workorderId',
      label: $t('mes.defect.workorder'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        api: loadTaskOptions,
        placeholder: $t('mes.defect.taskOptional'),
      },
      dependencies: {
        componentProps: (values) => ({
          params: { workorderId: values.workorderId },
        }),
        triggerFields: ['workorderId'],
      },
      fieldName: 'taskId',
      label: $t('mes.defect.task'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 0,
        formatter: trimDecimal,
        precision: 6,
      },
      fieldName: 'defectQty',
      label: $t('mes.defect.defectQty'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: enumOptions('DefectLevel'),
      },
      defaultValue: 'minor',
      fieldName: 'defectLevel',
      label: $t('mes.defect.defectLevel'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('mes.defect.descriptionPlaceholder'),
        rows: 3,
      },
      fieldName: 'description',
      formItemClass: 'md:col-span-2',
      label: $t('mes.defect.description'),
      rules: 'required',
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

/** 处置：方式与说明 */
export function useHandleSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: enumOptions('DefectHandleMethod'),
      },
      fieldName: 'handleMethod',
      label: $t('mes.defect.handleMethod'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('mes.defect.handleRemarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'handleRemark',
      label: $t('mes.defect.handleRemark'),
    },
  ];
}
