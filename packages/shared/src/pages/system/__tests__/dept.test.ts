import type { DeptApi } from '../../../api/system/dept';

import { describe, expect, it, vi } from 'vitest';

import { isRootDept, toDeptParentTree, toLeaderOptions } from '../dept';

vi.mock('@vben/locales', () => ({
  $t: (key: string, args?: Record<string, string>) =>
    args ? `${args.nickName}(${args.userName})` : key,
}));

function dept(
  deptId: string,
  parentId: number | string,
  status = '0',
): DeptApi.Dept {
  return { deptId, deptName: deptId, orderNum: 0, parentId, status };
}

describe('部门管理', () => {
  it('根部门的上级为 0', () => {
    expect(isRootDept(0)).toBe(true);
    expect(isRootDept('0')).toBe(true);
    expect(isRootDept('100')).toBe(false);
  });

  it('上级部门的可选树中停用的部门不可选', () => {
    const [root] = toDeptParentTree([dept('100', 0), dept('101', '100', '1')]);
    expect(root?.disabled).toBe(false);
    expect(root?.children?.[0]?.disabled).toBe(true);
  });

  it('负责人选项显示昵称与账号，当前负责人不在列表中时放在最前面', () => {
    const users = [
      { nickName: '张三', userId: '1', userName: 'zhangsan' },
      { nickName: 'lisi', userId: '2', userName: 'lisi' },
    ];
    expect(toLeaderOptions(users)).toEqual([
      { label: '张三(zhangsan)', value: '1' },
      { label: 'lisi', value: '2' },
    ]);
    expect(
      toLeaderOptions([], {
        ...dept('100', 0),
        leader: '9',
        leaderName: '王五',
      }),
    ).toEqual([{ label: '王五', value: '9' }]);
    expect(
      toLeaderOptions(users, { ...dept('100', 0), leader: '1' }),
    ).toHaveLength(2);
  });
});
