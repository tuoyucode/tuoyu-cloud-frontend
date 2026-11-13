import type { FactoryApi } from '@tuoyu/shared/api/mes/factory';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'factoryCode',
      label: $t('mes.factory.factoryCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'factoryName',
      label: $t('mes.factory.factoryName'),
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
export function useColumns(): VxeTableGridOptions<FactoryApi.Factory>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'factoryCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.factory.factoryCode'),
    },
    {
      field: 'factoryName',
      minWidth: 160,
      title: $t('mes.factory.factoryName'),
    },
    {
      field: 'shortName',
      minWidth: 100,
      title: $t('mes.factory.shortName'),
    },
    { field: 'contact', minWidth: 100, title: $t('mes.factory.contact') },
    {
      field: 'contactPhone',
      minWidth: 120,
      title: $t('mes.factory.contactPhone'),
    },
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

/** 新增、编辑表单：两列，地址与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.factory.factoryCodePlaceholder'),
      },
      fieldName: 'factoryCode',
      label: $t('mes.factory.factoryCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.factory.factoryNamePlaceholder'),
      },
      fieldName: 'factoryName',
      label: $t('mes.factory.factoryName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'shortName',
      label: $t('mes.factory.shortName'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'contact',
      label: $t('mes.factory.contact'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'contactPhone',
      label: $t('mes.factory.contactPhone'),
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
      component: 'Input',
      componentProps: {
        maxlength: 255,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'address',
      formItemClass: 'md:col-span-2',
      label: $t('mes.factory.address'),
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
