import type { TenantApi } from '@tuoyu/shared/api/system/tenant';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { TENANT_ID_PATTERN } from '@tuoyu/shared/api/system/tenant';
import {
  ADMIN_PASSWORD_MAX,
  ADMIN_PASSWORD_MIN,
  ADMIN_USER_NAME_MAX,
  ADMIN_USER_NAME_MIN,
  loadPackageOptions,
} from '@tuoyu/shared/pages/system/tenant';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export { loadPackageOptions } from '@tuoyu/shared/pages/system/tenant';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'tenantId',
      label: $t('system.tenant.tenantId'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'tenantName',
      label: $t('system.tenant.tenantName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'contactUser',
      label: $t('system.tenant.contactUser'),
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
export function useColumns(): VxeTableGridOptions<TenantApi.Tenant>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    { field: 'tenantId', minWidth: 120, title: $t('system.tenant.tenantId') },
    {
      field: 'tenantName',
      minWidth: 140,
      title: $t('system.tenant.tenantName'),
    },
    {
      field: 'packageId',
      minWidth: 120,
      slots: { default: 'package' },
      title: $t('system.tenant.package'),
    },
    {
      field: 'contactUser',
      minWidth: 100,
      title: $t('system.tenant.contactUser'),
    },
    {
      field: 'contactPhone',
      minWidth: 120,
      title: $t('system.tenant.contactPhone'),
    },
    { field: 'domain', minWidth: 160, title: $t('system.tenant.domain') },
    {
      field: 'expireTime',
      slots: { default: 'expireTime' },
      title: $t('system.tenant.expireTime'),
      width: 170,
    },
    {
      field: 'accountCount',
      slots: { default: 'accountCount' },
      title: $t('system.tenant.accountCount'),
      width: 110,
    },
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

/** 新增、编辑表单：两列，备注占整行；管理员账号与口令只在新增时显示 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.tenant.tenantIdPlaceholder') },
      fieldName: 'tenantId',
      help: $t('system.tenant.tenantIdHelp'),
      label: $t('system.tenant.tenantId'),
      rules: z
        .string({ error: $t('system.tenant.tenantIdRequired') })
        .regex(TENANT_ID_PATTERN, {
          message: $t('system.tenant.tenantIdInvalid'),
        }),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 50,
        placeholder: $t('system.tenant.tenantNamePlaceholder'),
      },
      fieldName: 'tenantName',
      label: $t('system.tenant.tenantName'),
      rules: 'required',
    },
    {
      component: 'Select',
      // 选项在抽屉打开时加载（启用的套餐）
      componentProps: {
        options: [],
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'packageId',
      help: $t('system.tenant.packageHelp'),
      label: $t('system.tenant.package'),
      rules: 'selectRequired',
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
        maxlength: 30,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'contactUser',
      label: $t('system.tenant.contactUser'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 20,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'contactPhone',
      label: $t('system.tenant.contactPhone'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 200,
        placeholder: $t('system.tenant.domainPlaceholder'),
      },
      fieldName: 'domain',
      formItemClass: 'md:col-span-2',
      help: $t('system.tenant.domainHelp'),
      label: $t('system.tenant.domain'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        placeholder: $t('system.tenant.neverExpire'),
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'expireTime',
      label: $t('system.tenant.expireTime'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 1,
        placeholder: $t('system.tenant.unlimited'),
        precision: 0,
      },
      fieldName: 'accountCount',
      label: $t('system.tenant.accountCount'),
    },
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        maxlength: ADMIN_USER_NAME_MAX,
        placeholder: $t('system.tenant.adminUserNamePlaceholder'),
      },
      fieldName: 'adminUserName',
      help: $t('system.tenant.adminHelp'),
      label: $t('system.tenant.adminUserName'),
      rules: z
        .string({ error: $t('system.tenant.adminUserNameRequired') })
        .min(ADMIN_USER_NAME_MIN, {
          message: $t('system.tenant.adminUserNameLength'),
        })
        .max(ADMIN_USER_NAME_MAX, {
          message: $t('system.tenant.adminUserNameLength'),
        }),
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
        maxlength: ADMIN_PASSWORD_MAX,
        placeholder: $t('system.tenant.adminPasswordPlaceholder'),
      },
      fieldName: 'adminPassword',
      label: $t('system.tenant.adminPassword'),
      rules: z
        .string({ error: $t('system.tenant.adminPasswordRequired') })
        .min(ADMIN_PASSWORD_MIN, {
          message: $t('system.tenant.adminPasswordLength'),
        })
        .max(ADMIN_PASSWORD_MAX, {
          message: $t('system.tenant.adminPasswordLength'),
        }),
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

/** 加载表单中依赖字典与套餐的选项 */
export async function loadFormOptions() {
  const [status, packages] = await Promise.all([
    getDictOptions(DictType.NORMAL_DISABLE),
    loadPackageOptions(),
  ]);
  return { packages, status };
}
