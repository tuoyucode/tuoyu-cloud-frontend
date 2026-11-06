import { describe, expect, it } from 'vitest';

import { listToTree } from '../tree';

describe('listToTree', () => {
  it('按父节点组装成树，找不到父节点的作为根节点', () => {
    const tree = listToTree(
      [
        { id: '1', name: '总公司', parentId: '0' },
        { id: '2', name: '研发部', parentId: '1' },
        { id: '3', name: '平台组', parentId: '2' },
        { id: '4', name: '市场部', parentId: '1' },
        { id: '9', name: '孤立部门', parentId: '404' },
      ],
      'id',
      'parentId',
    );

    expect(tree.map((node) => node.name)).toEqual(['总公司', '孤立部门']);
    expect(tree[0]?.children?.map((node) => node.name)).toEqual([
      '研发部',
      '市场部',
    ]);
    expect(
      (tree[0]?.children?.[0] as { children?: { name: string }[] })
        ?.children?.[0]?.name,
    ).toBe('平台组');
  });

  it('数字与字符串形式的 ID 视为相同，不修改原列表', () => {
    const list = [
      { id: 1, parentId: 0 },
      { id: 2, parentId: '1' },
    ];
    const tree = listToTree(list, 'id', 'parentId');

    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(1);
    expect(list[0]).not.toHaveProperty('children');
  });
});
