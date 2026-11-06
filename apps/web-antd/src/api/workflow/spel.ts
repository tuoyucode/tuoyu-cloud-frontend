import type { PageQuery, PageResult } from '#/api/types';

import { requestClient } from '#/api/request';

export namespace SpelApi {
  /** 流程表达式（FlowSpelVo）：设计器中选择办理人时可以引用 */
  export interface Spel {
    /** Spring Bean 名称 */
    componentName?: string;
    createTime?: string;
    id: string;
    /** 参数，逗号分隔 */
    methodParams?: string;
    methodName?: string;
    remark?: string;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
    /** 完整的 SpEL 表达式，例如 #{@spelRuleComponent.selectDeptLeaderById(#initiatorDeptId)} */
    viewSpel: string;
  }

  /** 查询条件（FlowSpelBo） */
  export interface Query extends PageQuery {
    componentName?: string;
    methodName?: string;
    status?: string;
  }

  /** 新增、修改的参数（FlowSpelBo） */
  export type Form = Omit<Spel, 'createTime' | 'id'> & { id?: string };
}

const BASE = '/workflow/spel';

export function listSpel(query: SpelApi.Query) {
  return requestClient.get<PageResult<SpelApi.Spel>>(`${BASE}/list`, {
    params: query,
  });
}

export function getSpel(id: string) {
  return requestClient.get<SpelApi.Spel>(`${BASE}/${id}`);
}

export function addSpel(data: SpelApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateSpel(data: SpelApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeSpel(ids: string[]) {
  return requestClient.delete<null>(`${BASE}/${ids.join(',')}`);
}
