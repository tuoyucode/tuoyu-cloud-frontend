import type { TaskApi } from '../../../api/workflow/task';

import { describe, expect, it } from 'vitest';

import {
  buildAssigneeMap,
  businessFormPath,
  businessLabel,
  canCancel,
  isFinishedStatus,
  missingAssigneeNodes,
  variableName,
  visibleButtonCodes,
} from '../task-utils';

/** 流程变量形式的办理人配置：${name} */
const variable = (name: string) => `\${${name}}`;

const nodes: TaskApi.FlowNode[] = [
  {
    nodeCode: 'leader',
    nodeName: '部门负责人',
    permissionFlag: variable('leader'),
  },
  { nodeCode: 'hr', nodeName: '人事', permissionFlag: '1,2' },
  {
    nodeCode: 'finance',
    nodeName: '财务',
    permissionFlag: variable(' finance '),
  },
];

describe('工作流：节点按钮', () => {
  it('只保留显示的按钮', () => {
    const codes = visibleButtonCodes([
      { code: 'back', show: true },
      { code: 'transfer', show: false },
      { code: 'copy', show: true },
    ]);
    expect([...codes].toSorted()).toEqual(['back', 'copy']);
    expect(visibleButtonCodes(undefined).size).toBe(0);
  });
});

describe('工作流：弹窗选人', () => {
  it('从办理人配置中取出流程变量名', () => {
    expect(variableName(variable('leader'))).toBe('leader');
    expect(variableName(` ${variable(' a.b ')} `)).toBe('a.b');
    expect(variableName('role:1')).toBeUndefined();
    expect(variableName('#{@bean.method()}')).toBeUndefined();
    expect(variableName(undefined)).toBeUndefined();
  });

  it('只提交办理人为变量、且选了用户的节点', () => {
    expect(
      buildAssigneeMap(nodes, {
        finance: [],
        hr: ['9'],
        leader: ['1', '2'],
      }),
    ).toEqual({ leader: '1,2' });
  });

  it('办理人为变量的节点必须选择用户', () => {
    expect(
      missingAssigneeNodes(nodes, { leader: ['1'] }).map(
        (node) => node.nodeCode,
      ),
    ).toEqual(['finance']);
    expect(
      missingAssigneeNodes(nodes, { finance: ['3'], leader: ['1'] }),
    ).toEqual([]);
  });
});

describe('工作流：流程状态', () => {
  it('已完成、已作废、已终止为已结束', () => {
    expect(isFinishedStatus('finish')).toBe(true);
    expect(isFinishedStatus('invalid')).toBe(true);
    expect(isFinishedStatus('termination')).toBe(true);
    expect(isFinishedStatus('waiting')).toBe(false);
    expect(isFinishedStatus('back')).toBe(false);
    expect(isFinishedStatus(undefined)).toBe(false);
  });

  it('只有待审核的流程可以撤销', () => {
    expect(canCancel('waiting')).toBe(true);
    expect(canCancel('back')).toBe(false);
    expect(canCancel('finish')).toBe(false);
  });
});

describe('工作流：显示与参数', () => {
  it('业务名称：标题 > 编码 > 业务 ID', () => {
    expect(
      businessLabel({
        businessCode: 'C1',
        businessId: '9',
        businessTitle: 'T',
      }),
    ).toBe('T');
    expect(businessLabel({ businessCode: 'C1', businessId: '9' })).toBe('C1');
    expect(businessLabel({ businessId: '9' })).toBe('9');
    expect(businessLabel({})).toBe('');
  });
});

describe('businessFormPath', () => {
  it('规范化为 views 下的页面路径：去掉首尾空白、开头的 / 与 .vue', () => {
    expect(businessFormPath('mes/material-request/approval-detail')).toBe(
      'mes/material-request/approval-detail',
    );
    expect(businessFormPath(' /mes/a/b.vue ')).toBe('mes/a/b');
  });

  it('空路径与可能越出 views 的路径视为没有表单', () => {
    expect(businessFormPath()).toBeUndefined();
    expect(businessFormPath('')).toBeUndefined();
    expect(businessFormPath('  ')).toBeUndefined();
    expect(businessFormPath('../secret')).toBeUndefined();
    expect(businessFormPath('mes/../../x')).toBeUndefined();
    expect(businessFormPath(String.raw`mes\a`)).toBeUndefined();
  });
});
