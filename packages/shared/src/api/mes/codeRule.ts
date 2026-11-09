import type { PageQuery, PageResult } from '../types';

import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace CodeRuleApi {
  /** 编码规则（MesCodeRuleVo） */
  export interface CodeRule {
    /** 是否为系统单据使用的内置规则 */
    builtin: boolean;
    createTime?: string;
    /** 日期格式，为空表示不带日期 */
    datePattern?: string;
    prefix?: string;
    remark?: string;
    /** 重置周期（ResetCycle） */
    resetCycle: string;
    ruleCode: string;
    ruleId: string;
    ruleName: string;
    serialLength: number;
    /** 0 正常，1 停用 */
    status: string;
  }

  /** 查询条件（MesCodeRuleBo） */
  export interface Query extends PageQuery {
    ruleCode?: string;
    ruleName?: string;
    status?: string;
  }

  /** 新增、修改的参数（MesCodeRuleBo） */
  export type Form = Omit<CodeRule, 'builtin' | 'createTime' | 'ruleId'> & {
    ruleId?: string;
  };
}

const BASE = `${MES_BASE}/code-rule`;

export function listCodeRule(query: CodeRuleApi.Query) {
  return requestClient.get<PageResult<CodeRuleApi.CodeRule>>(`${BASE}/list`, {
    params: query,
  });
}

export function getCodeRule(ruleId: string) {
  return requestClient.get<CodeRuleApi.CodeRule>(`${BASE}/${ruleId}`);
}

/** 预览按规则生成的编号（流水号为 1，不占用流水号） */
export function previewCodeRule(ruleId: string) {
  return requestClient.get<string>(`${BASE}/${ruleId}/preview`);
}

export function addCodeRule(data: CodeRuleApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateCodeRule(data: CodeRuleApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeCodeRule(ruleIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${ruleIds.join(',')}`);
}
