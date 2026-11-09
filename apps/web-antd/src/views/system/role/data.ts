import type { RoleApi } from '@tuoyu/shared/api/system/role';
import type { UserApi } from '@tuoyu/shared/api/system/user';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/** 自定义数据权限：按勾选的部门 */
export const DATA_SCOPE_CUSTOM: RoleApi.DataScope = '2';

/** 数据范围选项（后端 SysRoleBo.dataScope，没有对应的字典） */
export function useDataScopeOptions(): {
  label: string;
  value: RoleApi.DataScope;
}[] {
  return (['1', '2', '3', '4', '5', '6'] as const).map((value) => ({
    label: $t(`system.role.dataScope${value}`),
    value,
  }));
}

/** 创建时间范围提交为 params[beginTime]、params[endTime]，结束日期包含当天 */
export const searchFieldMappingTime: [
  string,
  [string, string],
  [string, string],
][] = [
  [
    'createTime',
    ['params[beginTime]', 'params[endTime]'],
    ['YYYY-MM-DD 00:00:00', 'YYYY-MM-DD 23:59:59'],
  ],
];

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'roleName',
      label: $t('system.role.roleName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'roleKey',
      label: $t('system.role.roleKey'),
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
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full' },
      fieldName: 'createTime',
      label: $t('crud.createTime'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<RoleApi.Role>['columns'] {
  const scopeLabels = new Map(
    useDataScopeOptions().map((option) => [option.value, option.label]),
  );
  return [
    { type: 'checkbox', width: 48 },
    { field: 'roleName', minWidth: 140, title: $t('system.role.roleName') },
    { field: 'roleKey', minWidth: 140, title: $t('system.role.roleKey') },
    {
      field: 'dataScope',
      formatter: ({ cellValue }) => scopeLabels.get(cellValue) ?? '',
      minWidth: 160,
      title: $t('system.role.dataScope'),
    },
    { field: 'roleSort', title: $t('crud.sort'), width: 100 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 90,
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
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

/** 新增、编辑表单：两列，备注占整行；菜单权限在表单下方单独展示 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.role.roleNamePlaceholder') },
      fieldName: 'roleName',
      label: $t('system.role.roleName'),
      rules: z
        .string({ error: $t('system.role.roleNameRequired') })
        .trim()
        .min(1, { message: $t('system.role.roleNameRequired') })
        .max(30, { message: $t('system.role.roleNameLength') }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.role.roleKeyPlaceholder') },
      fieldName: 'roleKey',
      help: $t('system.role.roleKeyHelp'),
      label: $t('system.role.roleKey'),
      rules: z
        .string({ error: $t('system.role.roleKeyRequired') })
        .trim()
        .min(1, { message: $t('system.role.roleKeyRequired') })
        .max(100, { message: $t('system.role.roleKeyLength') }),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'roleSort',
      label: $t('crud.sort'),
      rules: 'required',
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

/** 分配用户页面：用户查询条件 */
export function useUserSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'userName',
      label: $t('system.user.userName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'phoneNumber',
      label: $t('system.user.phoneNumber'),
    },
  ];
}

/** 分配用户页面：用户列 */
export function useUserColumns(
  withActions: boolean,
): VxeTableGridOptions<UserApi.User>['columns'] {
  const columns: VxeTableGridOptions<UserApi.User>['columns'] = [
    { type: 'checkbox', width: 48 },
    { field: 'userName', minWidth: 120, title: $t('system.user.userName') },
    { field: 'nickName', minWidth: 120, title: $t('system.user.nickName') },
    {
      field: 'phoneNumber',
      minWidth: 120,
      title: $t('system.user.phoneNumber'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.NORMAL_DISABLE },
      },
      field: 'status',
      title: $t('crud.status'),
      width: 90,
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
  ];
  if (withActions) {
    columns.push({
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 120,
    });
  }
  return columns;
}
