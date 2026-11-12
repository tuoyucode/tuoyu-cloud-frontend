import { describe, expect, it } from 'vitest';

import { filterDeptTree, toUserForm } from '../user';

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

describe('用户管理：部门树筛选', () => {
  const tree = [
    {
      children: [
        {
          children: [{ id: '111', label: '研发一组', parentId: '11' }],
          id: '11',
          label: '研发部',
          parentId: '1',
        },
        { id: '12', label: '市场部', parentId: '1' },
      ],
      id: '1',
      label: '总公司',
      parentId: '0',
    },
  ];

  it('保留匹配的部门及其上级，去掉不匹配的同级', () => {
    expect(filterDeptTree(tree, '市场')).toEqual([
      {
        ...tree[0],
        children: [{ id: '12', label: '市场部', parentId: '1' }],
      },
    ]);
  });

  it('匹配的部门保留全部下级', () => {
    const [root] = filterDeptTree(tree, '研发部');
    expect(root?.children?.[0]?.children).toHaveLength(1);
  });

  it('没有匹配时为空', () => {
    expect(filterDeptTree(tree, '财务')).toEqual([]);
  });
});
