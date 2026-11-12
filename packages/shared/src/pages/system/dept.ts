import type { DeptApi } from '../../api/system/dept';

import { $t } from '@vben/locales';

import { listToTree } from '../../utils/tree';

/** 字典 sys_normal_disable：0 正常 */
export const STATUS_NORMAL = '0';

/** 根部门的上级 ID */
export const ROOT_PARENT_ID = 0;

/** 部门邮箱的格式 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 是否根部门（根部门没有上级，不能修改上级） */
export function isRootDept(parentId: unknown) {
  return String(parentId) === String(ROOT_PARENT_ID);
}

/** 负责人选项的显示名称：昵称（账号） */
export function leaderLabel(user: DeptApi.LeaderCandidate) {
  return user.nickName && user.nickName !== user.userName
    ? $t('system.dept.leaderOption', {
        nickName: user.nickName,
        userName: user.userName,
      })
    : user.userName;
}

/** 上级部门的可选树：停用的部门下不能新增部门，设为不可选 */
export function toDeptParentTree(depts: DeptApi.Dept[]) {
  const nodes = depts.map((dept) => ({
    ...dept,
    disabled: dept.status !== STATUS_NORMAL,
  }));
  return listToTree(nodes, 'deptId', 'parentId');
}

/**
 * 负责人的可选项：本部门的用户。当前负责人不在其中时（例如没有查看用户的权限）放在最前面
 */
export function toLeaderOptions(
  users: DeptApi.LeaderCandidate[],
  record?: DeptApi.Dept,
): { label: string; value: string }[] {
  const options = users.map((user) => ({
    label: leaderLabel(user),
    value: user.userId,
  }));
  const leader = record?.leader;
  if (leader && !options.some((option) => option.value === leader)) {
    options.unshift({ label: record?.leaderName || leader, value: leader });
  }
  return options;
}
