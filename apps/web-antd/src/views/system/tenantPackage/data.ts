import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TenantPackageApi } from '#/api/system/tenantPackage';

import { DictType, getDictOptions } from '#/api/system/dict';
import { $t } from '#/locales';

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'packageName',
      label: $t('system.tenantPackage.packageName'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<TenantPackageApi.TenantPackage>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'packageName',
      minWidth: 160,
      title: $t('system.tenantPackage.packageName'),
    },
    { field: 'remark', minWidth: 200, title: $t('crud.remark') },
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

/** 新增、编辑表单：菜单树在表单下方 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 50,
        placeholder: $t('system.tenantPackage.packageNamePlaceholder'),
      },
      fieldName: 'packageName',
      label: $t('system.tenantPackage.packageName'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      help: $t('system.tenantPackage.statusHelp'),
      label: $t('crud.status'),
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

/** 加载表单中依赖字典的选项 */
export async function loadFormOptions() {
  return { status: await getDictOptions(DictType.NORMAL_DISABLE) };
}
