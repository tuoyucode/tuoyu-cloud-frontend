import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace DefectApi {
  /** 不良记录（MesDefectRecordVo） */
  export interface Defect {
    /** 当前（最近一次）审批的业务 ID，用于查看审批记录与撤销审批；没有审批过时为空 */
    approvalBusinessId?: string;
    createTime?: string;
    defectCode: string;
    defectId: string;
    /** 不良等级（DefectLevel） */
    defectLevel: string;
    defectQty: number;
    description?: string;
    /** 处置方式（DefectHandleMethod） */
    handleMethod?: string;
    handleRemark?: string;
    /** 处置状态（DefectHandleStatus） */
    handleStatus: string;
    handleTime?: string;
    handleUserId?: string;
    handleUserName?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    operationName?: string;
    remark?: string;
    /** 来源单据编号（报工单号或检验单号） */
    sourceCode?: string;
    sourceId?: string;
    /** 来源（DefectSource） */
    sourceType: string;
    taskId?: string;
    workorderCode?: string;
    workorderId: string;
  }

  /** 查询条件（MesDefectRecordBo） */
  export interface Query extends PageQuery {
    defectCode?: string;
    defectLevel?: string;
    handleStatus?: string;
    sourceType?: string;
    taskId?: string;
    workorderCode?: string;
    workorderId?: string;
  }

  /** 手工登记的参数（MesDefectRecordBo） */
  export interface Form {
    defectLevel: string;
    defectQty: number;
    description: string;
    remark?: string;
    taskId?: string;
    workorderId: string;
  }

  /** 处置的参数（MesDefectHandleBo） */
  export interface HandleForm {
    handleMethod: string;
    handleRemark?: string;
  }
}

const BASE = `${MES_BASE}/defect`;

export function listDefect(query: DefectApi.Query) {
  return requestClient.get<PageResult<DefectApi.Defect>>(`${BASE}/list`, {
    params: query,
  });
}

export function getDefect(defectId: string) {
  return requestClient.get<DefectApi.Defect>(`${BASE}/${defectId}`);
}

export function getDefectLogs(defectId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${defectId}/logs`);
}

export function addDefect(data: DefectApi.Form) {
  return requestClient.post<null>(BASE, data);
}

/**
 * 处置，返回处置后的状态：handled 已处置；approving 已提交审批（开启不良处置评审时的让步接收、报废）
 */
export function handleDefect(defectId: string, data: DefectApi.HandleForm) {
  return requestClient.post<string>(`${BASE}/${defectId}/handle`, data);
}

export function exportDefect(query: DefectApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
