import type { UserApi } from '../../api/system/user';
import type { TreeNode } from '../../api/types';

/** 密码长度与登录接口一致 */
export const PASSWORD_MIN = 5;
export const PASSWORD_MAX = 30;

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

/**
 * 表单值转为新增、修改用户的请求。
 * 角色、岗位都可以为空：修改时空数组表示清空（不传表示不修改），
 * 所以未选择时一律提交空数组；密码只在新增时提交
 */
export function toUserForm(
  values: Record<string, unknown>,
  userId?: string,
): UserApi.Form {
  const ids = (value: unknown) =>
    Array.isArray(value) ? value.map(String) : [];
  const form = {
    ...values,
    postIds: ids(values.postIds),
    roleIds: ids(values.roleIds),
  } as UserApi.Form;
  return userId ? { ...form, password: undefined, userId } : form;
}

/**
 * 部门树按名称筛选：保留名称匹配的部门（连同它的全部下级）及其上级
 */
export function filterDeptTree(
  nodes: TreeNode<string>[],
  text: string,
): TreeNode<string>[] {
  const result: TreeNode<string>[] = [];
  for (const node of nodes) {
    if (node.label.includes(text)) {
      result.push(node);
      continue;
    }
    const children = filterDeptTree(node.children ?? [], text);
    if (children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}
