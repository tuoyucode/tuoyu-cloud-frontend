import type { PageQuery, PageResult } from '#/api/types';

import { requestClient } from '#/api/request';

export namespace InstanceApi {
  /** 流程实例（FlowInstanceVo） */
  export interface Instance {
    /** 1 激活，0 挂起 */
    activityStatus?: number;
    businessCode?: string;
    businessId: string;
    businessTitle?: string;
    category?: string;
    categoryName?: string;
    createBy?: string;
    /** 申请人昵称 */
    createByName?: string;
    createTime?: string;
    definitionId?: string;
    flowCode?: string;
    flowName?: string;
    /** 流程状态（字典 wf_business_status） */
    flowStatus?: string;
    flowStatusName?: string;
    formCustom?: string;
    formPath?: string;
    id: string;
    /** 当前所在节点 */
    nodeName?: string;
    updateTime?: string;
    version?: string;
  }

  /** 查询条件（FlowInstanceBo） */
  export interface Query extends PageQuery {
    businessId?: string;
    category?: string;
    /** 申请人 ID，逗号拼接 */
    createByIds?: string;
    flowCode?: string;
    flowName?: string;
    nodeName?: string;
  }

  /** 审批记录（FlowHisTaskVo）；待审批的任务也在其中，flowStatus 为 waiting */
  export interface HisTask {
    approver?: string;
    approverName?: string;
    businessId?: string;
    /** 协作方式名称：审批、转办、委派、会签、票签、加签、减签 */
    cooperateTypeName?: string;
    createTime?: string;
    /** 附件 ossId，逗号分隔 */
    ext?: string;
    /** 审批结果（字典 wf_task_status） */
    flowStatus?: string;
    id: string;
    message?: string;
    nodeCode?: string;
    nodeName?: string;
    runDuration?: string;
    targetNodeName?: string;
    updateTime?: string;
  }

  /** 流程图与审批记录 */
  export interface History {
    instanceId: string;
    list: HisTask[];
  }

  /** 流程变量 */
  export interface Variables {
    /** 变量原文（JSON） */
    variable?: string;
    variableList: { key: string; value: unknown }[];
  }
}

const BASE = '/workflow/instance';

/** 运行中的流程实例 */
export function listRunningInstance(query: InstanceApi.Query) {
  return requestClient.get<PageResult<InstanceApi.Instance>>(
    `${BASE}/pageByRunning`,
    { params: query },
  );
}

/** 已结束的流程实例 */
export function listFinishedInstance(query: InstanceApi.Query) {
  return requestClient.get<PageResult<InstanceApi.Instance>>(
    `${BASE}/pageByFinish`,
    { params: query },
  );
}

/** 当前用户发起的流程（我发起的） */
export function listMyInstance(query: InstanceApi.Query) {
  return requestClient.get<PageResult<InstanceApi.Instance>>(
    `${BASE}/pageByCurrent`,
    { params: query },
  );
}

export function getInstanceByBusinessId(businessId: string) {
  return requestClient.get<InstanceApi.Instance>(
    `${BASE}/getInfo/${businessId}`,
  );
}

/** 审批记录（含待审批的任务）与流程实例 ID */
export function getInstanceHistory(businessId: string) {
  return requestClient.get<InstanceApi.History>(
    `${BASE}/flowHisTaskList/${businessId}`,
  );
}

/** 删除运行中的流程实例 */
export function removeInstance(instanceIds: string[]) {
  return requestClient.delete<null>(
    `${BASE}/deleteByInstanceIds/${instanceIds.join(',')}`,
  );
}

/** 删除已结束的流程实例（历史） */
export function removeFinishedInstance(instanceIds: string[]) {
  return requestClient.delete<null>(
    `${BASE}/deleteHisByInstanceIds/${instanceIds.join(',')}`,
  );
}

/** 撤销申请（申请人撤回） */
export function cancelInstance(businessId: string, message?: string) {
  return requestClient.put<null>(`${BASE}/cancelProcessApply`, {
    businessId,
    message,
  });
}

/** 激活（true）或挂起（false） */
export function activeInstance(id: string, active: boolean) {
  return requestClient.put<boolean>(`${BASE}/active/${id}`, null, {
    params: { active },
  });
}

/** 作废 */
export function invalidInstance(id: string, comment?: string) {
  return requestClient.post<boolean>(`${BASE}/invalid`, { comment, id });
}

export function getInstanceVariables(instanceId: string) {
  return requestClient.get<InstanceApi.Variables>(
    `${BASE}/instanceVariable/${instanceId}`,
  );
}

/** 修改流程变量：只能修改已有的变量，值按字符串保存 */
export function updateInstanceVariable(
  instanceId: string,
  key: string,
  value: string,
) {
  return requestClient.put<null>(`${BASE}/updateVariable`, {
    instanceId,
    key,
    value,
  });
}
