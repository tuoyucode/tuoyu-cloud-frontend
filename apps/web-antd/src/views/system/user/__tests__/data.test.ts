import { describe, expect, it, vi } from 'vitest';

import { toUserForm } from '../data';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('用户管理：提交数据', () => {
  it('修改时清空的角色、岗位提交空数组（后端据此清空），不提交密码', () => {
    expect(
      toUserForm(
        {
          nickName: '张三',
          password: 'ignored',
          postIds: [],
          roleIds: undefined,
          userName: 'zhangsan',
        },
        '100',
      ),
    ).toEqual({
      nickName: '张三',
      password: undefined,
      postIds: [],
      roleIds: [],
      userId: '100',
      userName: 'zhangsan',
    });
  });

  it('新增时角色可以为空，选中的 ID 统一为字符串', () => {
    expect(
      toUserForm({
        nickName: '李四',
        password: 'typed-by-admin',
        postIds: ['1', 2],
        userName: 'lisi',
      }),
    ).toEqual({
      nickName: '李四',
      password: 'typed-by-admin',
      postIds: ['1', '2'],
      roleIds: [],
      userName: 'lisi',
    });
  });
});
