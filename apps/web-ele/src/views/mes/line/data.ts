import type { LineApi } from '@tuoyu/shared/api/mes/line';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 启用的车间（下拉选项） */
async function workshopOptions() {
  return toSelectOptions(await getMesOptions('workshop'));
}

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: workshopOptions,
        clearable: true,
        filterable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workshopId',
      label: $t('mes.line.workshop'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'lineCode',
      label: $t('mes.line.lineCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'lineName',
      label: $t('mes.line.lineName'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        clearable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<LineApi.Line>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'lineCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.line.lineCode'),
    },
    { field: 'lineName', minWidth: 160, title: $t('mes.line.lineName') },
    {
      field: 'workshopName',
      minWidth: 140,
      title: $t('mes.line.workshop'),
    },
    { field: 'factoryName', minWidth: 140, title: $t('mes.line.factory') },
    { field: 'sortNo', title: $t('crud.sort'), width: 100 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 100,
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
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

/** 新增、编辑表单：两列，备注占整行；所属工厂由车间带出，不在表单中填写 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: workshopOptions,
        class: 'w-full',
        filterable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workshopId',
      formItemClass: 'md:col-span-2',
      help: $t('mes.line.workshopHelp'),
      label: $t('mes.line.workshop'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.line.lineCodePlaceholder'),
      },
      fieldName: 'lineCode',
      label: $t('mes.line.lineCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.line.lineNamePlaceholder'),
      },
      fieldName: 'lineName',
      label: $t('mes.line.lineName'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        min: 0,
      },
      defaultValue: 0,
      fieldName: 'sortNo',
      label: $t('crud.sort'),
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      label: $t('crud.status'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
        showWordLimit: true,
        type: 'textarea',
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}

/** 加载表单中依赖字典的选项（单选框只需要文字与值） */
export async function loadFormOptions() {
  const status = await getDictOptions(DictType.NORMAL_DISABLE);
  return {
    status: status.map(({ label, value }) => ({ label, value })),
  };
}
