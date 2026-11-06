import type { PageQuery, PageResult } from '#/api/types';

import { requestClient } from '#/api/request';

export namespace TaskApi {
  /** 节点上的按钮权限（ButtonPermissionVo），code 见 ButtonCode */
  export interface ButtonPermission {
    code: string;
    show: boolean;
    value?: string;
  }

  /** 待办、抄送中的任务（FlowTaskVo） */
  export interface Task {
    /** 是否为申请人节点（被退回后由申请人重新提交） */
    applyNode?: boolean;
    assigneeIds?: string;
    assigneeNames?: string;
    businessCode?: string;
    businessId: string;
    businessTitle?: string;
    buttonList?: ButtonPermission[];
    category?: string;
    categoryName?: string;
    /** 节点配置的默认抄送人 */
    copyList?: { nickName?: string; userId: string }[];
    createBy?: string;
    createByName?: string;
    createTime?: string;
    definitionId?: string;
    flowCode?: string;
    flowName?: string;
    flowStatus?: string;
    flowStatusName?: string;
    formCustom?: string;
    formPath?: string;
    id: string;
    instanceId: string;
    nodeCode?: string;
    nodeName?: string;
    /** 大于 0 为会签或票签 */
    nodeRatio?: string;
    processedBy?: string;
    processedByName?: string;
    updateTime?: string;
    version?: string;
  }

  /** 已办任务（FlowHisTaskVo） */
  export interface HisTask {
    approver?: string;
    approverName?: string;
    businessCode?: string;
    businessId: string;
    businessTitle?: string;
    categoryName?: string;
    cooperateTypeName?: string;
    createByName?: string;
    createTime?: string;
    flowCode?: string;
    flowName?: string;
    /** 本次处理结果（字典 wf_task_status） */
    flowStatus?: string;
    /** 流程当前状态（字典 wf_business_status） */
    flowTaskStatus?: string;
    id: string;
    instanceId: string;
    message?: string;
    nodeName?: string;
    runDuration?: string;
    updateTime?: string;
    version?: string;
  }

  /** 任务查询条件（FlowTaskBo） */
  export interface Query extends PageQuery {
    category?: string;
    /** 申请人 ID，逗号拼接 */
    createByIds?: string;
    flowCode?: string;
    flowName?: string;
    nodeName?: string;
  }

  /** 流程节点（下一节点、可退回的节点） */
  export interface FlowNode {
    nodeCode: string;
    nodeName: string;
    nodeType?: number;
    /** 办理人：解析出用户时为用户 ID（逗号分隔），否则为设计器中的原始配置 */
    permissionFlag?: string;
  }

  /** 办理人 */
  export interface Assignee {
    deptId?: string;
    nickName: string;
    userId: string;
    userName?: string;
  }

  /** 办理（通过）的参数（CompleteTaskBo） */
  export interface CompleteForm {
    /** 弹窗选择的下一节点办理人：变量名 → 用户 ID（逗号分隔） */
    assigneeMap?: Record<string, string>;
    /** 附件 ossId，逗号分隔 */
    ext?: string;
    flowCopyList?: { nickName?: string; userId: string }[];
    message?: string;
    /** 通知方式：1 站内信，2 邮件，3 短信 */
    messageType?: string[];
    taskId: string;
    variables?: Record<string, unknown>;
  }

  /** 退回的参数（BackProcessBo） */
  export interface BackForm {
    message?: string;
    messageType?: string[];
    nodeCode: string;
    taskId: string;
  }

  /** 委派、转办、加签、减签 */
  export type Operation =
    | 'addSignature'
    | 'delegateTask'
    | 'reductionSignature'
    | 'transferTask';
}

/** 节点按钮权限的编码（ButtonPermissionEnum） */
export const ButtonCode = {
  /** 加签 */
  ADD_SIGN: 'addSign',
  /** 退回 */
  BACK: 'back',
  /** 抄送 */
  COPY: 'copy',
  /** 办理时弹窗选择下一节点办理人 */
  POP: 'pop',
  /** 减签 */
  SUB_SIGN: 'subSign',
  /** 终止 */
  TERMINATION: 'termination',
  /** 转办 */
  TRANSFER: 'transfer',
  /** 委派（委托） */
  TRUST: 'trust',
} as const;

const BASE = '/workflow/task';

/** 我的待办 */
export function listMyWaitingTask(query: TaskApi.Query) {
  return requestClient.get<PageResult<TaskApi.Task>>(`${BASE}/pageByTaskWait`, {
    params: query,
  });
}

/** 我的已办 */
export function listMyFinishedTask(query: TaskApi.Query) {
  return requestClient.get<PageResult<TaskApi.HisTask>>(
    `${BASE}/pageByTaskFinish`,
    { params: query },
  );
}

/** 我的抄送 */
export function listMyCopyTask(query: TaskApi.Query) {
  return requestClient.get<PageResult<TaskApi.Task>>(`${BASE}/pageByTaskCopy`, {
    params: query,
  });
}

/** 全部待办（流程监控） */
export function listAllWaitingTask(query: TaskApi.Query) {
  return requestClient.get<PageResult<TaskApi.Task>>(
    `${BASE}/pageByAllTaskWait`,
    { params: query },
  );
}

/** 全部已办（流程监控） */
export function listAllFinishedTask(query: TaskApi.Query) {
  return requestClient.get<PageResult<TaskApi.HisTask>>(
    `${BASE}/pageByAllTaskFinish`,
    { params: query },
  );
}

/** 任务详情，含节点的按钮权限与默认抄送人 */
export function getTask(taskId: string) {
  return requestClient.get<TaskApi.Task>(`${BASE}/getTask/${taskId}`);
}

/** 办理（通过） */
export function completeTask(data: TaskApi.CompleteForm) {
  return requestClient.post<null>(`${BASE}/completeTask`, data);
}

/** 退回到指定节点 */
export function backTask(data: TaskApi.BackForm) {
  return requestClient.post<null>(`${BASE}/backProcess`, data);
}

/** 可退回的节点 */
export function listBackNodes(taskId: string, nodeCode: string) {
  return requestClient.get<TaskApi.FlowNode[]>(
    `${BASE}/getBackTaskNode/${taskId}/${nodeCode}`,
  );
}

/** 下一节点及其办理人（用于弹窗选人） */
export function listNextNodes(
  taskId: string,
  variables?: Record<string, unknown>,
) {
  return requestClient.post<TaskApi.FlowNode[]>(`${BASE}/getNextNodeList`, {
    taskId,
    variables,
  });
}

/** 终止流程 */
export function terminateTask(taskId: string, comment?: string) {
  return requestClient.post<boolean>(`${BASE}/terminationTask`, {
    comment,
    taskId,
  });
}

/**
 * 委派、转办（userId）与加签、减签（userIds）
 */
export function operateTask(
  operation: TaskApi.Operation,
  data: {
    message?: string;
    taskId: string;
    userId?: string;
    userIds?: string[];
  },
) {
  return requestClient.post<null>(`${BASE}/taskOperation/${operation}`, data);
}

/** 修改办理人（流程监控） */
export function updateTaskAssignee(taskIds: string[], userId: string) {
  return requestClient.put<null>(`${BASE}/updateAssignee/${userId}`, taskIds);
}

/** 当前任务的全部办理人（减签时选择） */
export function listTaskAssignees(taskId: string) {
  return requestClient.get<TaskApi.Assignee[]>(
    `${BASE}/currentTaskAllUser/${taskId}`,
  );
}

/** 催办 */
export function urgeTask(
  taskIds: string[],
  message: string,
  messageType: string[],
) {
  return requestClient.post<null>(`${BASE}/urgeTask`, {
    message,
    messageType,
    taskIdList: taskIds,
  });
}
