import type { MesApi } from './common';

import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace AndonApi {
  /** 安灯事件（MesAndonEventVo） */
  export interface Event {
    assignTime?: string;
    closeTime?: string;
    content?: string;
    createTime?: string;
    deviceId?: string;
    deviceName?: string;
    downtimeMinutes?: number;
    downtimeReasonId?: string;
    downtimeReasonName?: string;
    /** 已持续分钟数（未解决时按当前时间计算） */
    durationMinutes?: number;
    eventCode: string;
    eventId: string;
    /** 紧急程度（AndonLevel） */
    eventLevel: string;
    /** 状态（AndonStatus） */
    eventStatus: string;
    /** 异常类型（AndonType） */
    eventType: string;
    handlerUserId?: string;
    handlerUserName?: string;
    lineId?: string;
    lineName?: string;
    remark?: string;
    reportTime: string;
    reportUserId: string;
    reportUserName?: string;
    resolveRemark?: string;
    resolveTime?: string;
    responseTime?: string;
    stationId?: string;
    stationName?: string;
    title: string;
    workorderCode?: string;
    workorderId?: string;
    workshopId: string;
    workshopName?: string;
  }

  /** 查询条件（MesAndonEventBo） */
  export interface Query extends PageQuery {
    eventCode?: string;
    eventLevel?: string;
    eventStatus?: string;
    eventType?: string;
    handlerUserId?: string;
    /** 只看派给我的 */
    mine?: boolean;
    /** 上报时间范围：params[beginTime]、params[endTime] */
    params?: Record<string, unknown>;
    workshopId?: string;
  }

  /** 上报（MesAndonEventBo） */
  export interface Report {
    content?: string;
    deviceId?: string;
    downtimeReasonId?: string;
    eventLevel: string;
    eventType: string;
    lineId?: string;
    remark?: string;
    stationId?: string;
    title: string;
    workorderId?: string;
    workshopId: string;
  }
}

const BASE = `${MES_BASE}/andon`;

export function listAndon(query: AndonApi.Query) {
  return requestClient.get<PageResult<AndonApi.Event>>(`${BASE}/list`, {
    params: query,
  });
}

export function getAndon(eventId: string) {
  return requestClient.get<AndonApi.Event>(`${BASE}/${eventId}`);
}

export function getAndonLogs(eventId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${eventId}/logs`);
}

export function reportAndon(data: AndonApi.Report) {
  return requestClient.post<null>(BASE, data);
}

export function assignAndon(eventId: string, handlerUserId: string) {
  return requestClient.post<null>(`${BASE}/${eventId}/assign`, {
    handlerUserId,
  });
}

export function processAndon(eventId: string) {
  return requestClient.post<null>(`${BASE}/${eventId}/process`);
}

export function resolveAndon(
  eventId: string,
  data: { downtimeReasonId?: string; resolveRemark: string },
) {
  return requestClient.post<null>(`${BASE}/${eventId}/resolve`, data);
}

export function closeAndon(eventId: string, reason?: string) {
  return requestClient.post<null>(`${BASE}/${eventId}/close`, { reason });
}

export function exportAndon(query: AndonApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
