import type { ProductionReportApi } from '@tuoyu/shared/api/mes/productionReport';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';
import { userOptions } from '#/views/mes/operation-task/data';
import { formatQty } from '#/views/mes/workorder/data';

/** 查询条件：第一行 4 个，其余折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'workorderCode',
      label: $t('mes.productionReport.workorderCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'reportCode',
      label: $t('mes.productionReport.reportCode'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: enumOptions('ReportStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'reportStatus',
      label: $t('mes.productionReport.status'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'reportTimeRange',
      label: $t('mes.productionReport.reportTime'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: userOptions,
        clearable: true,
        filterable: true,
        placeholder: $t('mes.operationTask.searchUser'),
      },
      fieldName: 'reportUserId',
      label: $t('mes.productionReport.reportUser'),
    },
  ];
}

/** 查询表单的值转为后端的查询条件：报工时间按整天转为起止时间 */
export function toQuery(
  values: Record<string, any>,
): ProductionReportApi.Query {
  const { reportTimeRange, ...rest } = values;
  const query: ProductionReportApi.Query = { ...rest };
  if (Array.isArray(reportTimeRange) && reportTimeRange.length === 2) {
    query.beginReportTime = `${reportTimeRange[0]} 00:00:00`;
    query.endReportTime = `${reportTimeRange[1]} 23:59:59`;
  }
  return query;
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<ProductionReportApi.Report>['columns'] {
  return [
    {
      field: 'reportCode',
      fixed: 'left',
      minWidth: 150,
      sortable: true,
      title: $t('mes.productionReport.reportCode'),
    },
    {
      field: 'reportStatus',
      slots: { default: 'status' },
      title: $t('mes.productionReport.status'),
      width: 100,
    },
    {
      field: 'workorderCode',
      minWidth: 150,
      title: $t('mes.productionReport.workorderCode'),
    },
    {
      field: 'operationName',
      formatter: ({ row }) =>
        [row.seqNo, row.operationName].filter((v) => v !== undefined).join(' '),
      minWidth: 120,
      title: $t('mes.productionReport.operationName'),
    },
    {
      field: 'materialName',
      minWidth: 140,
      title: $t('mes.productionReport.materialName'),
    },
    {
      align: 'right',
      field: 'qualifiedQty',
      formatter: ({ row }) => formatQty(row.qualifiedQty),
      sortable: true,
      title: $t('mes.productionReport.qualifiedQty'),
      width: 100,
    },
    {
      align: 'right',
      field: 'defectQty',
      formatter: ({ row }) => formatQty(row.defectQty),
      sortable: true,
      title: $t('mes.productionReport.defectQty'),
      width: 100,
    },
    {
      align: 'right',
      field: 'workMinutes',
      formatter: ({ row }) => formatQty(row.workMinutes),
      title: $t('mes.productionReport.workMinutes'),
      width: 110,
    },
    {
      field: 'reportUserName',
      minWidth: 100,
      title: $t('mes.productionReport.reportUser'),
    },
    {
      field: 'reportTime',
      sortable: true,
      title: $t('mes.productionReport.reportTime'),
      width: 170,
    },
    {
      field: 'stationName',
      minWidth: 110,
      title: $t('mes.productionReport.station'),
    },
    {
      field: 'teamName',
      minWidth: 100,
      title: $t('mes.productionReport.team'),
    },
    {
      field: 'batchCode',
      minWidth: 120,
      title: $t('mes.productionReport.batchCode'),
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 240,
    },
  ];
}
