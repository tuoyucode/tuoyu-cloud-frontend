import type { ClientApi } from '@tuoyu/shared/api/system/client';
import type { DictApi } from '@tuoyu/shared/api/system/dict';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { formatSeconds } from '@tuoyu/shared/pages/system/client';

import { $t } from '#/locales';

/** 查询条件：一行最多 4 个（后端均为精确匹配） */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'clientKey',
      label: $t('system.client.clientKey'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'clientId',
      label: $t('system.client.clientId'),
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

/** 表格列：不显示客户端密钥 */
export function useColumns(): VxeTableGridOptions<ClientApi.Client>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'clientKey',
      minWidth: 120,
      title: $t('system.client.clientKey'),
    },
    {
      className: 'font-mono',
      field: 'clientId',
      minWidth: 280,
      title: $t('system.client.clientId'),
    },
    {
      field: 'grantTypeList',
      minWidth: 200,
      slots: { default: 'grantTypes' },
      title: $t('system.client.grantType'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.DEVICE_TYPE },
      },
      field: 'deviceType',
      title: $t('system.client.deviceType'),
      width: 100,
    },
    {
      field: 'activeTimeout',
      formatter: formatSeconds,
      title: $t('system.client.activeTimeout'),
      width: 140,
    },
    {
      field: 'timeout',
      formatter: formatSeconds,
      title: $t('system.client.timeout'),
      width: 140,
    },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 100,
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

/** 新增、编辑表单：两列，访问路径与 IP 白名单占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('system.client.clientKeyPlaceholder'),
      },
      fieldName: 'clientKey',
      label: $t('system.client.clientKey'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'new-password',
        maxlength: 255,
        placeholder: $t('system.client.clientSecretPlaceholder'),
        showPassword: true,
        type: 'password',
      },
      fieldName: 'clientSecret',
      label: $t('system.client.clientSecret'),
      rules: 'required',
    },
    {
      component: 'Select',
      // 选项在抽屉打开时从字典加载
      componentProps: {
        class: 'w-full',
        multiple: true,
        options: [],
        placeholder: $t('crud.selectPlaceholder'),
      },
      defaultValue: [],
      fieldName: 'grantTypeList',
      formItemClass: 'md:col-span-2',
      label: $t('system.client.grantType'),
      // 多选：空数组也算未填
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        clearable: true,
        options: [],
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'deviceType',
      label: $t('system.client.deviceType'),
    },
    {
      component: 'RadioGroup',
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      label: $t('crud.status'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', controlsPosition: 'right', min: -1 },
      defaultValue: 1800,
      fieldName: 'activeTimeout',
      help: $t('system.client.activeTimeoutHelp'),
      label: $t('system.client.activeTimeout'),
      renderComponentContent: () => ({
        suffix: () => $t('system.client.seconds'),
      }),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', controlsPosition: 'right', min: -1 },
      defaultValue: 604_800,
      fieldName: 'timeout',
      help: $t('system.client.timeoutHelp'),
      label: $t('system.client.timeout'),
      renderComponentContent: () => ({
        suffix: () => $t('system.client.seconds'),
      }),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        class: 'font-mono',
        placeholder: $t('system.client.accessPathPlaceholder'),
        rows: 3,
        type: 'textarea',
      },
      fieldName: 'accessPath',
      formItemClass: 'md:col-span-2',
      help: $t('system.client.accessPathHelp'),
      label: $t('system.client.accessPath'),
    },
    {
      component: 'Input',
      componentProps: {
        class: 'font-mono',
        placeholder: $t('system.client.ipWhitelistPlaceholder'),
        rows: 3,
        type: 'textarea',
      },
      fieldName: 'ipWhitelist',
      formItemClass: 'md:col-span-2',
      help: $t('system.client.ipWhitelistHelp'),
      label: $t('system.client.ipWhitelist'),
    },
  ];
}

/** 只保留选项的文字与值 */
function toOptions(options: DictApi.DictOption[]) {
  return options.map(({ label, value }) => ({ label, value }));
}

/** 加载表单中依赖字典的选项（下拉与单选框只需要文字与值） */
export async function loadFormOptions() {
  const [grantType, deviceType, status] = await Promise.all([
    getDictOptions(DictType.GRANT_TYPE),
    getDictOptions(DictType.DEVICE_TYPE),
    getDictOptions(DictType.NORMAL_DISABLE),
  ]);
  return {
    deviceType: toOptions(deviceType),
    grantType: toOptions(grantType),
    status: toOptions(status),
  };
}
