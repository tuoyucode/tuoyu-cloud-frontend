import type { SnApi } from './sn';

import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace TraceApi {
  /** 识别出的类型 */
  export type MatchType = 'batch' | 'material_batch' | 'sn' | 'workorder';

  export interface Report {
    defectQty: number | string;
    qualifiedQty: number | string;
    reportCode: string;
    reportId: string;
    reportQty: number | string;
    reportStatus: string;
    reportTime?: string;
    reportUserName?: string;
    stationName?: string;
    teamName?: string;
  }

  export interface Task {
    actualEndTime?: string;
    actualStartTime?: string;
    defectQty: number | string;
    operationCode?: string;
    operationName: string;
    planQty: number | string;
    qualifiedQty: number | string;
    reports: Report[];
    seqNo: number;
    taskCode: string;
    taskId: string;
    taskStatus: string;
  }

  export interface Material {
    actualQty?: number | string;
    batchCode?: string;
    completeTime?: string;
    locationName?: string;
    materialCode?: string;
    materialName?: string;
    requestCode: string;
    requestId: string;
    requestType: string;
    unit?: string;
  }

  export interface Inspection {
    defectQty?: number | string;
    inspectQty?: number | string;
    inspectionCode: string;
    inspectionId: string;
    inspectionResult?: string;
    inspectionStatus: string;
    inspectionTime?: string;
    inspectionType: string;
    inspectorName?: string;
    operationName?: string;
    qualifiedQty?: number | string;
  }

  export interface Defect {
    createTime?: string;
    defectCode: string;
    defectId: string;
    defectLevel: string;
    defectQty: number | string;
    description?: string;
    handleMethod?: string;
    handleStatus: string;
    handleTime?: string;
    handleUserName?: string;
    operationName?: string;
    sourceType: string;
  }

  export interface StockIn {
    completeTime?: string;
    createTime?: string;
    locationName?: string;
    qty: number | string;
    stockInCode: string;
    stockInId: string;
    stockInStatus: string;
    warehouseName?: string;
  }

  export interface Workorder {
    actualEndTime?: string;
    actualStartTime?: string;
    batchCode?: string;
    completedQty: number | string;
    currentSn?: SnApi.Sn;
    defectQty: number | string;
    defects: Defect[];
    inspections: Inspection[];
    lineName?: string;
    materialCode?: string;
    materialName?: string;
    materials: Material[];
    planEndTime?: string;
    planQty: number | string;
    planStartTime?: string;
    snCount: number;
    stockedQty: number | string;
    stockIns: StockIn[];
    tasks: Task[];
    unit?: string;
    workorderCode: string;
    workorderId: string;
    workorderStatus: string;
    workshopName?: string;
  }

  /** 时间线中的一个事件 */
  export interface Event {
    action: string;
    bizCode?: string;
    /** 单据类型（BizType） */
    category: string;
    defectQty?: number | string;
    fromStatus?: string;
    operatorName?: string;
    qty?: number | string;
    remark?: string;
    time: string;
    toStatus?: string;
    workorderCode?: string;
  }

  /** 追溯结果（MesTraceVo） */
  export interface Result {
    keyword: string;
    /** 没有匹配时为空 */
    matchType?: MatchType;
    timeline: Event[];
    /** 匹配到的工单超过上限时为 true（只返回最近的工单） */
    truncated: boolean;
    workorders: Workorder[];
  }
}

/** 按序列号、生产批次号、物料批次号或工单编号追溯（后端自动识别） */
export function traceByKeyword(keyword: string) {
  return requestClient.get<TraceApi.Result>(`${MES_BASE}/trace`, {
    params: { keyword },
  });
}
