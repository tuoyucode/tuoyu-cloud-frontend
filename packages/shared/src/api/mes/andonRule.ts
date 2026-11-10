import type { PageQuery, PageResult } from '../types';

import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace AndonRuleApi {
  /** 安灯升级规则（MesAndonRuleVo） */
  export interface Rule {
    andonRuleId: string;
    createTime?: string;
    /** 超时后升级到的紧急程度（AndonLevel），为空表示只提醒 */
    escalateLevel?: string;
    /** 适用的紧急程度（AndonLevel），为空表示全部级别 */
    eventLevel?: string;
    /** 适用的异常类型（AndonType），为空表示全部类型 */
    eventType?: string;
    /** 提醒人员的昵称，逗号分隔 */
    notifyUserNames?: string;
    /** 提醒人员的用户 ID，逗号分隔 */
    notifyUsers?: string;
    remark?: string;
    /** 解决时限（分钟） */
    resolveMinutes?: number;
    /** 响应时限（分钟，上报后多久内必须开始处理） */
    responseMinutes?: number;
    ruleName: string;
    /** 0 正常，1 停用 */
    status: string;
  }

  /** 查询条件（MesAndonRuleBo） */
  export interface Query extends PageQuery {
    eventLevel?: string;
    eventType?: string;
    ruleName?: string;
    status?: string;
  }

  /** 新增、修改的参数（MesAndonRuleBo）：可清空的字段不填时发送 null */
  export interface Form {
    andonRuleId?: string;
    escalateLevel?: null | string;
    eventLevel?: null | string;
    eventType?: null | string;
    /** 提醒人员；空数组表示只提醒当前处理人 */
    notifyUserIds: string[];
    remark?: string;
    resolveMinutes?: null | number;
    responseMinutes?: null | number;
    ruleName: string;
    status?: string;
  }
}

const BASE = `${MES_BASE}/andon-rule`;

export function listAndonRule(query: AndonRuleApi.Query) {
  return requestClient.get<PageResult<AndonRuleApi.Rule>>(`${BASE}/list`, {
    params: query,
  });
}

export function getAndonRule(andonRuleId: string) {
  return requestClient.get<AndonRuleApi.Rule>(`${BASE}/${andonRuleId}`);
}

export function addAndonRule(data: AndonRuleApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateAndonRule(data: AndonRuleApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeAndonRule(andonRuleIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${andonRuleIds.join(',')}`);
}
