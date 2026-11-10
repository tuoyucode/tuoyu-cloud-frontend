import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace DashboardApi {
  /** 汇总卡片 */
  export interface Summary {
    activeWorkorders: number;
    openAndons: number;
    pendingDefects: number;
    todayDefectQty: number | string;
    todayQualifiedQty: number | string;
    /** 今日良率（百分数），没有报工时为空 */
    todayYieldRate?: null | number | string;
  }

  /** 一天的报工汇总 */
  export interface DailyTrend {
    date: string;
    defectQty: number | string;
    qualifiedQty: number | string;
    yieldRate?: null | number | string;
  }

  export interface WorkorderProgress {
    completedQty: number | string;
    /** 完成率（百分数） */
    completionRate?: null | number | string;
    materialCode?: string;
    materialName?: string;
    overdue: boolean;
    planEndTime?: string;
    planQty: number | string;
    workorderCode: string;
    workorderId: string;
  }

  export interface DefectTop {
    defectQty: number | string;
    operationName: string;
  }

  export interface AndonTypeStat {
    avgDowntimeMinutes?: null | number | string;
    count: number;
    /** 异常类型（AndonType） */
    eventType: string;
  }

  /** 看板数据（MesDashboardVo） */
  export interface Overview {
    andonByType: AndonTypeStat[];
    days: number;
    defectTop: DefectTop[];
    generatedAt: string;
    summary: Summary;
    trend: DailyTrend[];
    workorderProgress: WorkorderProgress[];
    workshopId?: string;
  }
}

/** 生产看板：workshopId 为空表示全部车间，days 为最近几天（1 ~ 90） */
export function getDashboardOverview(params: {
  days?: number;
  workshopId?: string;
}) {
  return requestClient.get<DashboardApi.Overview>(
    `${MES_BASE}/dashboard/overview`,
    { params },
  );
}
