import type { PageQuery, PageResult } from '../types';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

const BASE = `${MES_BASE}/analysis`;

export namespace AnalysisApi {
  /** 数量（后端为 BigDecimal，可能序列化为字符串） */
  export type Quantity = number | string;

  /** 百分数，没有分母时为空 */
  export type Rate = null | number | string;

  /** 报表 */
  export type Report =
    | 'defect'
    | 'downtime'
    | 'progress'
    | 'team'
    | 'wip'
    | 'workhour'
    | 'yield';

  /** 统计维度（AnalysisDimension） */
  export type Dimension =
    | 'date'
    | 'handleMethod'
    | 'level'
    | 'line'
    | 'operation'
    | 'product'
    | 'reason'
    | 'source'
    | 'team'
    | 'user';

  /** 按日期统计时的粒度（Granularity） */
  export type Granularity = 'day' | 'month' | 'week';

  /** 查询条件（MesAnalysisQueryBo）：日期必填（yyyy-MM-dd，两端都包含），最长 366 天 */
  export interface Query {
    beginDate: string;
    dimension?: Dimension;
    endDate: string;
    factoryId?: string;
    granularity?: Granularity;
    lineId?: string;
    materialId?: string;
    workshopId?: string;
  }

  export type ProgressQuery = PageQuery & Query;

  /** 生产进度：一个状态的工单数 */
  export interface StatusCount {
    overdueCount: number;
    /** 工单状态（WorkorderStatus） */
    status: string;
    workorderCount: number;
  }

  /** 生产进度：一个工单（MesProgressRowVo） */
  export interface ProgressRow {
    actualEndTime?: string;
    actualStartTime?: string;
    completedQty: Quantity;
    completionRate?: Rate;
    defectQty: Quantity;
    lineId?: string;
    lineName?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    overdue: boolean;
    planEndTime?: string;
    planQty: Quantity;
    planStartTime?: string;
    stockedQty: Quantity;
    workorderCode: string;
    workorderId: string;
    workorderStatus: string;
    workshopId: string;
    workshopName?: string;
  }

  /** 生产进度（MesProgressAnalysisVo） */
  export interface Progress {
    completedQty: Quantity;
    completionRate?: Rate;
    generatedAt: string;
    overdueCount: number;
    page: PageResult<ProgressRow>;
    planQty: Quantity;
    statuses: StatusCount[];
    workorderCount: number;
  }

  /** 在制品：一道工序（MesWipRowVo） */
  export interface WipRow {
    defectQty: Quantity;
    lineId?: string;
    lineName?: string;
    operationCode?: string;
    operationName?: string;
    pendingInputQty: Quantity;
    qualifiedQty: Quantity;
    seqNo?: number;
    wipQty: Quantity;
    workorderCount: number;
  }

  export interface Wip {
    dimension: Dimension;
    generatedAt: string;
    pendingInputQty: Quantity;
    rows: WipRow[];
    wipQty: Quantity;
    workorderCount: number;
  }

  /** 良率与直通率：一个统计项（MesYieldRowVo） */
  export interface YieldRow {
    defectQty: Quantity;
    firstPassYield?: Rate;
    /** 日期为区间起始日（按月为 yyyy-MM），产品、产线为 ID；没有产线时为空 */
    key?: null | string;
    label: string;
    qualifiedQty: Quantity;
    reportQty: Quantity;
    workorderCount: number;
    yieldRate?: Rate;
  }

  export interface Yield {
    defectQty: Quantity;
    dimension: Dimension;
    firstPassYield?: Rate;
    generatedAt: string;
    granularity: Granularity;
    qualifiedQty: Quantity;
    reportQty: Quantity;
    rows: YieldRow[];
    workorderCount: number;
    yieldRate?: Rate;
  }

  /** 不良柏拉图：一个类别（MesDefectParetoRowVo） */
  export interface DefectRow {
    cumulativeRatio?: Rate;
    defectQty: Quantity;
    /** 工序编码、不良等级、来源、处置方式的编码，或产品 ID；没有值时为空 */
    key?: null | string;
    label: string;
    ratio?: Rate;
    recordCount: number;
  }

  export interface Defect {
    defectQty: Quantity;
    dimension: Dimension;
    generatedAt: string;
    recordCount: number;
    /** 按不良数量从多到少排列 */
    rows: DefectRow[];
  }

  /** 停机分析：一个统计项（MesDowntimeRowVo） */
  export interface DowntimeRow {
    avgDowntimeMinutes?: Rate;
    downtimeMinutes: number;
    eventCount: number;
    key?: null | string;
    label: string;
    openCount: number;
    ratio?: Rate;
  }

  export interface Downtime {
    avgDowntimeMinutes?: Rate;
    dimension: Dimension;
    downtimeMinutes: number;
    eventCount: number;
    generatedAt: string;
    granularity: Granularity;
    openCount: number;
    rows: DowntimeRow[];
  }

  /** 工时：一个统计项（MesWorkhourRowVo） */
  export interface WorkhourRow {
    derivedMinutes: Quantity;
    key?: null | string;
    label: string;
    minutesPerUnit?: Rate;
    missingCount: number;
    qualifiedQty: Quantity;
    recordedMinutes: Quantity;
    reportCount: number;
    reportQty: Quantity;
    workHours: Quantity;
    workMinutes: Quantity;
  }

  export interface Workhour {
    dimension: Dimension;
    generatedAt: string;
    missingCount: number;
    reportCount: number;
    rows: WorkhourRow[];
    workHours: Quantity;
    workMinutes: Quantity;
  }

  /** 班组绩效：一个班组（MesTeamRowVo），没有班组时 teamId 为空 */
  export interface TeamRow {
    defectQty: Quantity;
    memberCount: number;
    missingCount: number;
    perCapitaQty?: Rate;
    qtyPerHour?: Rate;
    qualifiedQty: Quantity;
    reportCount: number;
    reportQty: Quantity;
    teamCode?: string;
    teamId?: null | string;
    teamName: string;
    workHours: Quantity;
    yieldRate?: Rate;
  }

  export interface Team {
    generatedAt: string;
    memberCount: number;
    perCapitaQty?: Rate;
    qualifiedQty: Quantity;
    reportCount: number;
    reportQty: Quantity;
    rows: TeamRow[];
    workHours: Quantity;
    yieldRate?: Rate;
  }
}

/** 生产进度：汇总与工单明细（分页，不支持排序） */
export function getProgressAnalysis(params: AnalysisApi.ProgressQuery) {
  return requestClient.get<AnalysisApi.Progress>(`${BASE}/progress`, {
    params,
  });
}

/** 在制品（统计时刻的快照） */
export function getWipAnalysis(params: AnalysisApi.Query) {
  return requestClient.get<AnalysisApi.Wip>(`${BASE}/wip`, { params });
}

/** 良率与直通率 */
export function getYieldAnalysis(params: AnalysisApi.Query) {
  return requestClient.get<AnalysisApi.Yield>(`${BASE}/yield`, { params });
}

/** 不良柏拉图 */
export function getDefectAnalysis(params: AnalysisApi.Query) {
  return requestClient.get<AnalysisApi.Defect>(`${BASE}/defect`, { params });
}

/** 停机分析 */
export function getDowntimeAnalysis(params: AnalysisApi.Query) {
  return requestClient.get<AnalysisApi.Downtime>(`${BASE}/downtime`, {
    params,
  });
}

/** 工时 */
export function getWorkhourAnalysis(params: AnalysisApi.Query) {
  return requestClient.get<AnalysisApi.Workhour>(`${BASE}/workhour`, {
    params,
  });
}

/** 班组绩效 */
export function getTeamAnalysis(params: AnalysisApi.Query) {
  return requestClient.get<AnalysisApi.Team>(`${BASE}/team`, { params });
}

/** 导出报表的明细（需要该报表的查看权限与 mes:analysis:export） */
export function exportAnalysis(
  report: AnalysisApi.Report,
  query: AnalysisApi.Query,
  fileName: string,
) {
  return exportExcel(`${BASE}/${report}/export`, { ...query }, fileName);
}
