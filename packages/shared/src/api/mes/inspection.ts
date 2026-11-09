import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace InspectionApi {
  /** 检验单（MesInspectionVo） */
  export interface Inspection {
    /** 方案的检验项目（只在详情中返回） */
    checkItems?: string;
    createTime?: string;
    defectQty?: number;
    inspectionCode: string;
    inspectionId: string;
    /** 检验结论（InspectionResult） */
    inspectionResult?: string;
    /** 检验状态（InspectionStatus） */
    inspectionStatus: string;
    inspectionTime?: string;
    /** 检验类型（InspectionType） */
    inspectionType: string;
    inspectorName?: string;
    inspectorUserId?: string;
    inspectQty?: number;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    operationName?: string;
    qualifiedQty?: number;
    remark?: string;
    resultRemark?: string;
    schemeId?: string;
    schemeName?: string;
    taskId?: string;
    workorderCode?: string;
    workorderId: string;
  }

  /** 查询条件（MesInspectionBo） */
  export interface Query extends PageQuery {
    inspectionCode?: string;
    inspectionResult?: string;
    inspectionStatus?: string;
    inspectionType?: string;
    taskId?: string;
    workorderCode?: string;
    workorderId?: string;
  }

  /** 新增的参数（MesInspectionBo） */
  export interface Form {
    inspectionType: string;
    inspectQty?: number;
    remark?: string;
    /** 为空时自动匹配 */
    schemeId?: string;
    /** 首检、巡检必填 */
    taskId?: string;
    workorderId: string;
  }

  /** 录入检验结果的参数（MesInspectionResultBo） */
  export interface ResultForm {
    defectQty: number;
    inspectionResult: string;
    inspectQty: number;
    qualifiedQty: number;
    resultRemark?: string;
  }
}

const BASE = `${MES_BASE}/inspection`;

export function listInspection(query: InspectionApi.Query) {
  return requestClient.get<PageResult<InspectionApi.Inspection>>(
    `${BASE}/list`,
    { params: query },
  );
}

export function getInspection(inspectionId: string) {
  return requestClient.get<InspectionApi.Inspection>(`${BASE}/${inspectionId}`);
}

export function getInspectionLogs(inspectionId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${inspectionId}/logs`);
}

export function addInspection(data: InspectionApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function inspectInspection(
  inspectionId: string,
  data: InspectionApi.ResultForm,
) {
  return requestClient.post<null>(`${BASE}/${inspectionId}/inspect`, data);
}

export function removeInspection(inspectionIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${inspectionIds.join(',')}`);
}

export function exportInspection(query: InspectionApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
