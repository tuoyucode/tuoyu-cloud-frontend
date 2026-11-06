import { describe, expect, it, vi } from 'vitest';

import { buildParentTree } from '../category/data';
import {
  designPath,
  exportFileName,
  publishStatusKey,
} from '../processDefinition/data';
import {
  formatVariableValue,
  isEditableVariable,
  variableType,
} from '../processInstance/data';
import { composeSpel } from '../spel/data';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('流程表达式：生成表达式', () => {
  it('组件与方法拼成 Bean 调用，参数加 #', () => {
    expect(
      composeSpel(
        'spelRuleComponent',
        'selectDeptLeaderById',
        'initiatorDeptId',
      ),
    ).toBe('#{@spelRuleComponent.selectDeptLeaderById(#initiatorDeptId)}');
    expect(composeSpel(' bean ', ' m ', ' a , b ')).toBe('#{@bean.m(#a,#b)}');
    expect(composeSpel('bean', 'm', '')).toBe('#{@bean.m()}');
  });

  it('只填一个参数时为流程变量', () => {
    expect(composeSpel('', '', 'initiator')).toBe(`\${initiator}`);
  });

  it('信息不足时返回 undefined', () => {
    expect(composeSpel('bean', '', 'a')).toBeUndefined();
    expect(composeSpel('', '', 'a,b')).toBeUndefined();
    expect(composeSpel()).toBeUndefined();
  });
});

describe('流程分类：上级分类的可选树', () => {
  const list = [
    { ancestors: '0', categoryId: '1', categoryName: 'OA', parentId: 0 },
    { ancestors: '0,1', categoryId: '2', categoryName: '假勤', parentId: '1' },
    {
      ancestors: '0,1,2',
      categoryId: '3',
      categoryName: '请假',
      parentId: '2',
    },
    { ancestors: '0', categoryId: '4', categoryName: '财务', parentId: 0 },
  ];

  it('最外层为顶级分类', () => {
    const [root] = buildParentTree(list);
    expect(root?.categoryId).toBe(0);
    expect(root?.children.map((node) => node.categoryId)).toEqual(['1', '4']);
    expect(root?.children[0]?.children?.[0]?.categoryId).toBe('2');
  });

  it('编辑时排除本分类及其下级', () => {
    const [root] = buildParentTree(list, '2');
    const ids: string[] = [];
    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        ids.push(String(node.categoryId));
        walk(node.children ?? []);
      }
    };
    walk(root?.children ?? []);
    expect(ids.toSorted()).toEqual(['1', '4']);
  });
});

describe('流程定义', () => {
  it('已发布的流程只读打开设计器', () => {
    expect(designPath({ id: '9', isPublish: 1 })).toBe(
      '/workflow/design/index?definitionId=9&disabled=true',
    );
    expect(designPath({ id: '9', isPublish: 0 })).toBe(
      '/workflow/design/index?definitionId=9',
    );
  });

  it('发布状态文案', () => {
    expect(publishStatusKey(1)).toBe('workflow.processDefinition.published');
    expect(publishStatusKey(9)).toBe('workflow.processDefinition.expired');
    expect(publishStatusKey(0)).toBe('workflow.processDefinition.unpublished');
    expect(publishStatusKey(undefined)).toBe(
      'workflow.processDefinition.unpublished',
    );
  });

  it('导出文件名带版本', () => {
    expect(exportFileName({ flowCode: 'leave', version: '2' })).toBe(
      'leave_v2.json',
    );
    expect(exportFileName({ flowCode: 'leave' })).toBe('leave.json');
  });
});

describe('流程变量', () => {
  it('显示文本：对象按 JSON', () => {
    expect(formatVariableValue({ a: 1 })).toBe('{"a":1}');
    expect(formatVariableValue(3)).toBe('3');
    expect(formatVariableValue(null)).toBe('');
  });

  it('只允许修改字符串变量', () => {
    expect(isEditableVariable('a')).toBe(true);
    expect(isEditableVariable(1)).toBe(false);
    expect(isEditableVariable(true)).toBe(false);
    expect(isEditableVariable({})).toBe(false);
  });

  it('类型标签', () => {
    expect(variableType([])).toBe('array');
    expect(variableType(undefined)).toBe('null');
    expect(variableType(1)).toBe('number');
  });
});
