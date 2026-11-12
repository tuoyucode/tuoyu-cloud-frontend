import type { RoleApi } from '../../api/system/role';

import { $t } from '@vben/locales';

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
