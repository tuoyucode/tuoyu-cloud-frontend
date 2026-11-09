import type { StockInApi } from '@tuoyu/shared/api/mes/stockIn';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';

import { $t } from '#/locales';
import { enumOptions } from '#/views/mes/_shared/enums';

/** 可以入库的工单：生产中、已完工 */
async function loadWorkorderOptions() {
  return toSelectOptions(
    await getMesOptions('workorder', { statuses: 'in_progress,completed' }),
  );
}

/** 成品仓 */
async function loadWarehouseOptions() {
  return toSelectOptions(
    await getMesOptions('warehouse', { warehouseType: 'finished' }),
  );
}

/** 仓库下的库位；未选仓库时为空 */
async function loadLocationOptions(params: { warehouseId?: string }) {
  if (!params.warehouseId) {
    return [];
  }
  return toSelectOptions(await getMesOptions('location', params));
}

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'stockInCode',
      label: $t('mes.stockIn.stockInCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'workorderCode',
      label: $t('mes.stockIn.workorderCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('StockInStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'stockInStatus',
      label: $t('mes.stockIn.stockInStatus'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<StockInApi.StockIn>['columns'] {
  return [
    {
      field: 'stockInCode',
      minWidth: 160,
      sortable: true,
      title: $t('mes.stockIn.stockInCode'),
    },
    {
      field: 'workorderCode',
      minWidth: 150,
      title: $t('mes.stockIn.workorderCode'),
    },
    {
      field: 'materialName',
      minWidth: 140,
      title: $t('mes.stockIn.product'),
    },
    {
      align: 'right',
      field: 'qty',
      formatter: ({ cellValue }) => formatQty(cellValue),
      title: $t('mes.stockIn.qty'),
      width: 110,
    },
    { field: 'unit', title: $t('mes.stockIn.unit'), width: 70 },
    {
      field: 'batchCode',
      minWidth: 130,
      title: $t('mes.stockIn.batchCode'),
    },
    {
      field: 'warehouseName',
      minWidth: 120,
      title: $t('mes.stockIn.warehouse'),
    },
    {
      field: 'locationName',
      minWidth: 100,
      title: $t('mes.stockIn.location'),
    },
    {
      field: 'stockInStatus',
      slots: { default: 'stockInStatus' },
      title: $t('mes.stockIn.stockInStatus'),
      width: 100,
    },
    {
      field: 'operatorUserName',
      minWidth: 100,
      title: $t('mes.stockIn.operator'),
    },
    {
      field: 'completeTime',
      title: $t('mes.stockIn.completeTime'),
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
      width: 220,
    },
  ];
}

/** 新增入库单：两列，备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: loadWorkorderOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workorderId',
      formItemClass: 'md:col-span-2',
      help: $t('mes.stockIn.workorderHelp'),
      label: $t('mes.stockIn.workorder'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: loadWarehouseOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'warehouseId',
      label: $t('mes.stockIn.warehouse'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: loadLocationOptions,
        placeholder: $t('crud.selectPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          params: { warehouseId: values.warehouseId },
        }),
        triggerFields: ['warehouseId'],
      },
      fieldName: 'locationId',
      label: $t('mes.stockIn.location'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 6 },
      fieldName: 'qty',
      help: $t('mes.stockIn.qtyHelp'),
      label: $t('mes.stockIn.qty'),
      rules: 'required',
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

/** 数量显示：去掉多余的 0 */
export function formatQty(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return String(Number(value));
}
