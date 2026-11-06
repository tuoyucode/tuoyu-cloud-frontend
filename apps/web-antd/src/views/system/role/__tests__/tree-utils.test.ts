import { describe, expect, it } from 'vitest';

import {
  canShowWithLinkage,
  collectTreeKeys,
  withAncestors,
  withoutSelectedAncestors,
} from '../tree-utils';

/**
 * 1
 * ├─ 11
 * │  ├─ 111
 * │  └─ 112
 * └─ 12
 * 2
 */
const tree = [
  {
    children: [
      { children: [{ id: '111' }, { id: '112' }], id: '11' },
      { id: '12' },
    ],
    id: '1',
  },
  { id: '2' },
];

describe('collectTreeKeys', () => {
  it('按先序列出全部节点', () => {
    expect(collectTreeKeys(tree)).toEqual(['1', '11', '111', '112', '12', '2']);
  });
});

describe('withAncestors', () => {
  it('补全勾选节点的全部上级（含半选）', () => {
    expect(withAncestors(tree, ['111']).toSorted()).toEqual(
      ['1', '11', '111'].toSorted(),
    );
  });

  it('多个节点共用上级时不重复', () => {
    expect(withAncestors(tree, ['111', '112', '12']).toSorted()).toEqual(
      ['1', '11', '111', '112', '12'].toSorted(),
    );
  });

  it('不在树中的节点原样保留', () => {
    expect(withAncestors(tree, ['999', '2']).toSorted()).toEqual(
      ['2', '999'].toSorted(),
    );
  });
});

describe('withoutSelectedAncestors', () => {
  it('去掉有下级被选中的上级，与后端读取时的规则一致', () => {
    expect(
      withoutSelectedAncestors(tree, ['1', '11', '111', '2']).toSorted(),
    ).toEqual(['111', '2'].toSorted());
  });

  it('没有下级被选中的上级保留', () => {
    expect(withoutSelectedAncestors(tree, ['11', '12'])).toEqual(['11', '12']);
  });

  it('与 withAncestors 互逆：保存的内容在切换联动方式后不变', () => {
    const leaves = ['111', '12'];
    expect(
      withoutSelectedAncestors(tree, withAncestors(tree, leaves)).toSorted(),
    ).toEqual(leaves.toSorted());
  });
});

describe('canShowWithLinkage', () => {
  it('父子联动保存的内容可以用联动方式显示', () => {
    expect(canShowWithLinkage(tree, withAncestors(tree, ['111', '12']))).toBe(
      true,
    );
    expect(canShowWithLinkage(tree, [])).toBe(true);
  });

  it('缺少上级时不能用联动方式显示', () => {
    expect(canShowWithLinkage(tree, ['111'])).toBe(false);
  });

  it('只选了上级、下级一个都没选时不能用联动方式显示', () => {
    expect(canShowWithLinkage(tree, ['1', '11'])).toBe(false);
  });

  it('不在树中的节点不影响判断', () => {
    expect(canShowWithLinkage(tree, ['2', '999'])).toBe(true);
  });
});
