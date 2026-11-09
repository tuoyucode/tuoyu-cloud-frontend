import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { InspectionApi } from '#/api/mes/inspection';

import { getMesOptions, toSelectOptions } from '#/api/mes/common';
import { getInspectionSchemeOptions } from '#/api/mes/inspectionScheme';
import { $t } from '#/locales';
import { enumOptions } from '#/views/mes/_shared/enums';

/** 首检、巡检允许的工单状态；完工检另外允许已完工 */
const RUNNING_STATUSES = 'released,in_progress,paused';
const FINAL_STATUSES = 'released,in_progress,paused,completed';

/** 工单 → 产品（工单选项的 parentId），用于按产品过滤检验方案 */
const workorderProducts = new Map<string, string | undefined>();

/** 可以检验的工单（最近 50 个） */
async function loadWorkorderOptions(params: { statuses?: string }) {
  const options = await getMesOptions('workorder', params);
  for (const option of options) {
    workorderProducts.set(option.id, option.parentId);
  }
  return toSelectOptions(options);
}

/** 工单的工序任务；未选工单时为空 */
async function loadTaskOptions(params: { workorderId?: string }) {
  if (!params.workorderId) {
    return [];
  }
  return toSelectOptions(await getMesOptions('operation-task', params));
}

/** 适用的检验方案：类型一致，产品为该工单产品或通用 */
async function loadSchemeOptions(params: {
  inspectionType?: string;
  materialId?: string;
}) {
  if (!params.inspectionType) {
    return [];
  }
  return toSelectOptions(await getInspectionSchemeOptions(params));
}

/** 工单下拉的状态过滤：完工检允许已完工的工单 */
export function workorderStatusesFor(inspectionType?: string) {
  return inspectionType === 'final' ? FINAL_STATUSES : RUNNING_STATUSES;
}

/** 数量显示：去掉多余的 0 */
export function formatQty(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return String(Number(value));
}

/** 查询条件：一行 4 个，多余的折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'inspectionCode',
      label: $t('mes.inspection.inspectionCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('InspectionType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'inspectionType',
      label: $t('mes.inspection.inspectionType'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'workorderCode',
      label: $t('mes.inspection.workorderCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('InspectionStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'inspectionStatus',
      label: $t('mes.inspection.inspectionStatus'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('InspectionResult'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'inspectionResult',
      label: $t('mes.inspection.inspectionResult'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<InspectionApi.Inspection>['columns'] {
  const qty = ({ cellValue }: { cellValue?: null | number | string }) =>
    formatQty(cellValue);
  return [
    {
      field: 'inspectionCode',
      minWidth: 160,
      sortable: true,
      title: $t('mes.inspection.inspectionCode'),
    },
    {
      field: 'inspectionType',
      slots: { default: 'inspectionType' },
      title: $t('mes.inspection.inspectionType'),
      width: 90,
    },
    {
      field: 'workorderCode',
      minWidth: 150,
      title: $t('mes.inspection.workorderCode'),
    },
    {
      field: 'operationName',
      minWidth: 110,
      title: $t('mes.inspection.operation'),
    },
    {
      field: 'materialName',
      minWidth: 130,
      title: $t('mes.inspection.product'),
    },
    {
      field: 'schemeName',
      minWidth: 130,
      title: $t('mes.inspection.scheme'),
    },
    {
      align: 'right',
      field: 'inspectQty',
      formatter: qty,
      title: $t('mes.inspection.inspectQty'),
      width: 90,
    },
    {
      align: 'right',
      field: 'qualifiedQty',
      formatter: qty,
      title: $t('mes.inspection.qualifiedQty'),
      width: 90,
    },
    {
      align: 'right',
      field: 'defectQty',
      formatter: qty,
      title: $t('mes.inspection.defectQty'),
      width: 90,
    },
    {
      field: 'inspectionStatus',
      slots: { default: 'inspectionStatus' },
      title: $t('mes.inspection.inspectionStatus'),
      width: 90,
    },
    {
      field: 'inspectionResult',
      slots: { default: 'inspectionResult' },
      title: $t('mes.inspection.inspectionResult'),
      width: 90,
    },
    {
      field: 'inspectorName',
      minWidth: 100,
      title: $t('mes.inspection.inspector'),
    },
    {
      field: 'inspectionTime',
      sortable: true,
      title: $t('mes.inspection.inspectionTime'),
      width: 170,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 180,
    },
  ];
}

/** 新增检验单：两列，备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: enumOptions('InspectionType'),
      },
      defaultValue: 'first',
      fieldName: 'inspectionType',
      formItemClass: 'md:col-span-2',
      label: $t('mes.inspection.inspectionType'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: loadWorkorderOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      dependencies: {
        componentProps: (values) => ({
          params: { statuses: workorderStatusesFor(values.inspectionType) },
        }),
        triggerFields: ['inspectionType'],
      },
      fieldName: 'workorderId',
      label: $t('mes.inspection.workorder'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: loadTaskOptions,
        placeholder: $t('crud.selectPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          params: { workorderId: values.workorderId },
        }),
        // 完工检可以不指定工序
        rules: (values) =>
          values.inspectionType === 'final' ? null : 'selectRequired',
        triggerFields: ['workorderId', 'inspectionType'],
      },
      fieldName: 'taskId',
      label: $t('mes.inspection.task'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: loadSchemeOptions,
        placeholder: $t('mes.inspection.schemeAuto'),
      },
      dependencies: {
        componentProps: (values) => ({
          params: {
            inspectionType: values.inspectionType,
            materialId: values.workorderId
              ? workorderProducts.get(values.workorderId)
              : undefined,
          },
        }),
        triggerFields: ['workorderId', 'inspectionType'],
      },
      fieldName: 'schemeId',
      help: $t('mes.inspection.schemeHelp'),
      label: $t('mes.inspection.scheme'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 0,
        placeholder: $t('mes.inspection.inspectQtyPlaceholder'),
        precision: 6,
      },
      fieldName: 'inspectQty',
      label: $t('mes.inspection.inspectQty'),
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

/** 录入检验结果：检验数、合格数、不良数与结论 */
export function useResultSchema(): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'inspectQty',
      label: $t('mes.inspection.inspectQty'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'qualifiedQty',
      label: $t('mes.inspection.qualifiedQty'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'defectQty',
      label: $t('mes.inspection.defectQty'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: enumOptions('InspectionResult'),
      },
      fieldName: 'inspectionResult',
      label: $t('mes.inspection.inspectionResult'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('mes.inspection.resultRemarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'resultRemark',
      formItemClass: 'md:col-span-2',
      label: $t('mes.inspection.resultRemark'),
    },
  ];
}
