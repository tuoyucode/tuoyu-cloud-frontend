import type { MesApi } from './common';

import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace ProductionReportApi {
  /** 报工记录（MesProductionReportVo） */
  export interface Report {
    batchCode?: string;
    defectQty: number;
    endTime?: string;
    lineId?: string;
    lineName?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    operationName?: string;
    qualifiedQty: number;
    remark?: string;
    reportCode: string;
    reportId: string;
    reportQty: number;
    /** 报工状态（ReportStatus） */
    reportStatus: string;
    reportTime: string;
    reportUserId: string;
    reportUserName?: string;
    seqNo?: number;
    startTime?: string;
    stationId?: string;
    stationName?: string;
    taskCode?: string;
    taskId: string;
    teamId?: string;
    teamName?: string;
    unit?: string;
    workMinutes?: number;
    workorderCode?: string;
    workorderId: string;
    workshopId: string;
    workshopName?: string;
  }

  /** 查询条件（MesProductionReportBo） */
  export interface Query extends PageQuery {
    /** 报工时间的起点（yyyy-MM-dd HH:mm:ss） */
    beginReportTime?: string;
    endReportTime?: string;
    reportCode?: string;
    reportStatus?: string;
    reportUserId?: string;
    taskId?: string;
    workorderCode?: string;
    workorderId?: string;
  }

  /** 提交报工的参数 */
  export interface Submit {
    defectQty?: number;
    endTime?: string;
    qualifiedQty: number;
    remark?: string;
    startTime?: string;
    /** 为空时取任务派工的工位 */
    stationId?: string;
    taskId: string;
    workMinutes?: number;
  }
}

const BASE = `${MES_BASE}/production-report`;

export function listProductionReport(query: ProductionReportApi.Query) {
  return requestClient.get<PageResult<ProductionReportApi.Report>>(
    `${BASE}/list`,
    { params: query },
  );
}

export function getProductionReport(reportId: string) {
  return requestClient.get<ProductionReportApi.Report>(`${BASE}/${reportId}`);
}

export function getProductionReportLogs(reportId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${reportId}/logs`);
}

export function submitProductionReport(data: ProductionReportApi.Submit) {
  return requestClient.post<null>(BASE, data);
}

/** 确认：已提交 → 已确认，确认后不能撤销 */
export function confirmProductionReport(reportId: string) {
  return requestClient.post<null>(`${BASE}/${reportId}/confirm`);
}

/** 撤销：原因必填，扣回任务与工单的数量 */
export function cancelProductionReport(reportId: string, reason: string) {
  return requestClient.post<null>(`${BASE}/${reportId}/cancel`, { reason });
}

export function exportProductionReport(
  query: ProductionReportApi.Query,
  fileName: string,
) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
