import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';

import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace OperationTaskApi {
  /** 工序任务（MesOperationTaskVo） */
  export interface Task {
    actualEndTime?: string;
    actualStartTime?: string;
    assigneeUserId?: string;
    assigneeUserName?: string;
    /** 本工序还能报工的数量 */
    availableQty?: number;
    batchCode?: string;
    createTime?: string;
    defectQty: number;
    /** 是否需要首检（Y 是 N 否） */
    firstInspection: string;
    /** 是否末道工序 */
    lastOperation?: boolean;
    lineId?: string;
    lineName?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    operationCode: string;
    operationName: string;
    planQty: number;
    qualifiedQty: number;
    remark?: string;
    seqNo: number;
    standardMinutes?: number;
    stationId?: string;
    stationName?: string;
    taskCode: string;
    taskId: string;
    /** 任务状态（TaskStatus） */
    taskStatus: string;
    teamId?: string;
    teamName?: string;
    unit?: string;
    workorderCode?: string;
    workorderId: string;
    /** 工单状态（WorkorderStatus），报工前判断工单是否允许报工 */
    workorderStatus?: string;
    workshopId: string;
    workshopName?: string;
  }

  /** 查询条件（MesOperationTaskBo） */
  export interface Query extends PageQuery {
    assigneeUserId?: string;
    /** 只看派给当前用户或当前用户所在班组的任务 */
    mine?: boolean;
    operationName?: string;
    taskCode?: string;
    /** 状态，多个用英文逗号分隔 */
    taskStatus?: string;
    teamId?: string;
    workorderCode?: string;
    workorderId?: string;
    workshopId?: string;
  }

  /** 派工参数：至少填一项；重新派工时三项按本次的值覆盖 */
  export interface Dispatch {
    assigneeUserId?: string;
    stationId?: string;
    teamId?: string;
  }
}

const BASE = `${MES_BASE}/operation-task`;

export function listOperationTask(query: OperationTaskApi.Query) {
  return requestClient.get<PageResult<OperationTaskApi.Task>>(`${BASE}/list`, {
    params: query,
  });
}

/** 我的任务（报工工作台）：派给当前用户或当前用户所在班组的任务 */
export function listMyOperationTask(query: OperationTaskApi.Query) {
  return requestClient.get<PageResult<OperationTaskApi.Task>>(`${BASE}/mine`, {
    params: query,
  });
}

export function getOperationTask(taskId: string) {
  return requestClient.get<OperationTaskApi.Task>(`${BASE}/${taskId}`);
}

export function getOperationTaskLogs(taskId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${taskId}/logs`);
}

/** 工单的工序任务选项：name 为“工序顺序 工序名称”，parentId 为工单 ID，按工序顺序排列 */
export function getOperationTaskOptions(workorderId?: string) {
  return requestClient.get<MesApi.Option[]>(`${BASE}/options`, {
    params: { workorderId },
  });
}

export function dispatchOperationTask(
  taskId: string,
  data: OperationTaskApi.Dispatch,
) {
  return requestClient.post<null>(`${BASE}/${taskId}/dispatch`, data);
}

/** 手动完成：生产中 → 已完成 */
export function completeOperationTask(taskId: string) {
  return requestClient.post<null>(`${BASE}/${taskId}/complete`);
}
