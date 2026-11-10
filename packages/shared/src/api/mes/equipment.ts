import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

/**
 * 设备管理：点检项目、点检记录、保养计划、保养工单与 OEE（后端 org.tuoyu.mes.equipment）
 */
export namespace EquipmentApi {
  /** 后端的 BigDecimal 按字符串返回（例如 "85.71"），提交时可以传数字 */
  export type Decimal = number | string;

  /** 点检项目（MesCheckItemVo） */
  export interface CheckItem {
    checkItemId: string;
    checkMethod?: string;
    checkStandard?: string;
    createTime?: string;
    deviceCode?: string;
    /** 适用设备；为空时按适用设备类型匹配 */
    deviceId?: string;
    deviceName?: string;
    deviceType?: string;
    itemName: string;
    lowerLimit?: Decimal | null;
    /** 是否必检（Y 是 N 否） */
    mandatory: string;
    remark?: string;
    /** 结果类型（CheckResultType：judge 判定、numeric 数值） */
    resultType: string;
    sortNo: number;
    /** 状态（0 正常 1 停用） */
    status: string;
    unit?: string;
    upperLimit?: Decimal | null;
  }

  /** 点检项目的查询条件 */
  export interface CheckItemQuery extends PageQuery {
    deviceId?: string;
    deviceType?: string;
    itemName?: string;
    resultType?: string;
    status?: string;
  }

  /** 点检项目的新增、修改参数（MesCheckItemBo） */
  export interface CheckItemForm {
    checkItemId?: string;
    checkMethod?: string;
    checkStandard?: string;
    deviceId?: string;
    deviceType?: string;
    itemName: string;
    lowerLimit?: Decimal | null;
    mandatory?: string;
    remark?: string;
    resultType: string;
    sortNo?: number;
    status?: string;
    unit?: string;
    upperLimit?: Decimal | null;
  }

  /** 点检记录的逐项结果（MesCheckRecordDetailVo） */
  export interface CheckRecordDetail {
    checkItemId?: string;
    checkMethod?: string;
    checkStandard?: string;
    detailId: string;
    itemName: string;
    /** 单项结果（CheckItemResult：ok 合格、ng 不合格），为空表示未检 */
    itemResult?: null | string;
    lowerLimit?: Decimal | null;
    mandatory: string;
    measuredValue?: Decimal | null;
    remark?: string;
    resultType: string;
    sortNo: number;
    unit?: string;
    upperLimit?: Decimal | null;
  }

  /** 点检记录（MesCheckRecordVo） */
  export interface CheckRecord {
    abnormalCount: number;
    andonRaised: string;
    andonTime?: string;
    /** 点检结论（CheckResult：normal 正常、abnormal 异常） */
    checkResult: string;
    checkRecordId: string;
    checkTime: string;
    checkerName?: string;
    checkerUserId: string;
    createTime?: string;
    /** 逐项结果（只在详情中返回） */
    details?: CheckRecordDetail[];
    deviceCode?: string;
    deviceId: string;
    deviceName?: string;
    recordCode: string;
    /** 记录状态（CheckRecordStatus：completed 已提交、voided 已作废） */
    recordStatus: string;
    remark?: string;
    voidReason?: string;
  }

  /** 点检记录的查询条件 */
  export interface CheckRecordQuery extends PageQuery {
    /** 点检时间的起点（yyyy-MM-dd HH:mm:ss） */
    beginCheckTime?: string;
    checkResult?: string;
    deviceId?: string;
    endCheckTime?: string;
    recordCode?: string;
    recordStatus?: string;
  }

  /** 提交点检时的单项结果：判定型填 itemResult，数值型填 measuredValue */
  export interface CheckRecordDetailForm {
    checkItemId: string;
    itemResult?: string;
    measuredValue?: number;
    remark?: string;
  }

  /** 提交点检（MesCheckRecordBo） */
  export interface CheckRecordForm {
    details: CheckRecordDetailForm[];
    deviceId: string;
    remark?: string;
  }

  /** 点检异常发起安灯（MesCheckAndonBo） */
  export interface CheckAndonForm {
    content?: string;
    /** 紧急程度（AndonLevel），为空时为 urgent */
    eventLevel?: string;
  }

  /** 保养计划（MesMaintenancePlanVo） */
  export interface MaintenancePlan {
    createTime?: string;
    cycleDays: number;
    deviceCode?: string;
    deviceId: string;
    deviceName?: string;
    generatedDueDate?: string;
    lastMaintenanceDate?: string;
    leadDays: number;
    maintenanceContent: string;
    nextDueDate: string;
    /** 启用的计划下次到期日期已过 */
    overdue?: boolean;
    planId: string;
    planName: string;
    remark?: string;
    status: string;
  }

  export interface MaintenancePlanQuery extends PageQuery {
    deviceId?: string;
    planName?: string;
    status?: string;
  }

  /** 保养计划的新增、修改参数（MesMaintenancePlanBo） */
  export interface MaintenancePlanForm {
    cycleDays: number;
    deviceId: string;
    lastMaintenanceDate?: string;
    leadDays?: number;
    maintenanceContent: string;
    /** 新增时可以为空（按上次保养日期加周期，没有时为今天） */
    nextDueDate?: string;
    planId?: string;
    planName: string;
    remark?: string;
    status?: string;
  }

  /** 保养工单（MesMaintenanceOrderVo） */
  export interface MaintenanceOrder {
    actualContent?: string;
    createTime?: string;
    deviceCode?: string;
    deviceId: string;
    deviceName?: string;
    dueDate: string;
    executorName?: string;
    executorUserId?: string;
    finishTime?: string;
    maintenanceContent: string;
    orderCode: string;
    orderId: string;
    /** 工单状态（MaintenanceOrderStatus） */
    orderStatus: string;
    /** 未完成且已过到期日期 */
    overdue?: boolean;
    planId: string;
    planName?: string;
    remark?: string;
    spareParts?: string;
    startTime?: string;
    workMinutes?: number;
  }

  export interface MaintenanceOrderQuery extends PageQuery {
    /** 到期日期的起点（yyyy-MM-dd） */
    beginDueDate?: string;
    deviceId?: string;
    endDueDate?: string;
    orderCode?: string;
    /** 状态，多个用英文逗号分隔 */
    orderStatus?: string;
    planId?: string;
  }

  /** 完成保养（MesMaintenanceCompleteBo） */
  export interface MaintenanceCompleteForm {
    actualContent: string;
    remark?: string;
    spareParts?: string;
    workMinutes: number;
  }

  /** OEE 的统计对象 */
  export type OeeTargetType = 'device' | 'line';

  /** OEE 的查询条件（MesOeeQueryBo），日期为 yyyy-MM-dd，含首尾，最长 366 天 */
  export interface OeeQuery {
    beginDate: string;
    endDate: string;
    targetId: string;
    targetType: OeeTargetType;
  }

  /**
   * OEE 的一天或汇总（MesOeeStatVo）。指标为百分数，不能计算时为空，
   * 原因见对应的 *Status（OeeMetricStatus：ok、unconfigured、no_data、idle）
   */
  export interface OeeStat {
    activeDays?: number;
    availability?: Decimal | null;
    availabilityStatus: string;
    downtimeMinutes: number;
    idealMinutes?: Decimal | null;
    oee?: Decimal | null;
    oeeStatus: string;
    outputQty: Decimal;
    performance?: Decimal | null;
    performanceStatus: string;
    plannedMinutes?: null | number;
    qualifiedQty: Decimal;
    quality?: Decimal | null;
    qualityStatus: string;
    runMinutes?: null | number;
    /** 日期（汇总时为空） */
    statDate?: string;
  }

  /** OEE 的计算结果（MesOeeVo） */
  export interface Oee {
    beginDate: string;
    /** 配置的标准节拍（分钟/件），为空时按工序的单件标准工时 */
    cycleMinutes?: Decimal | null;
    days: OeeStat[];
    endDate: string;
    /** 产出来源：station 设备所在工位、line 产线；设备没有关联工位与产线时为空 */
    outputSource?: null | string;
    outputSourceName?: null | string;
    plannedMinutesPerDay?: null | number;
    /** 计划生产时间取自：device 设备、line 所属产线；未配置时为空 */
    plannedSource?: null | string;
    summary: OeeStat;
    targetId: string;
    targetName?: string;
    targetType: OeeTargetType;
  }

  /** OEE 配置（MesOeeConfigVo / MesOeeConfigBo） */
  export interface OeeConfig {
    cycleMinutes?: Decimal | null;
    plannedMinutes?: null | number;
    remark?: string;
    targetId: string;
    targetType: OeeTargetType;
  }
}

const CHECK_ITEM = `${MES_BASE}/check-item`;
const CHECK_RECORD = `${MES_BASE}/check-record`;
const PLAN = `${MES_BASE}/maintenance-plan`;
const ORDER = `${MES_BASE}/maintenance-order`;
const OEE = `${MES_BASE}/oee`;

// ---------------------------------------------------------------- 点检项目

export function listCheckItem(query: EquipmentApi.CheckItemQuery) {
  return requestClient.get<PageResult<EquipmentApi.CheckItem>>(
    `${CHECK_ITEM}/list`,
    { params: query },
  );
}

export function getCheckItem(checkItemId: string) {
  return requestClient.get<EquipmentApi.CheckItem>(
    `${CHECK_ITEM}/${checkItemId}`,
  );
}

/** 设备主数据中已有的设备类型 */
export function getDeviceTypes() {
  return requestClient.get<string[]>(`${CHECK_ITEM}/device-types`);
}

/** 设备适用的启用项目（填写点检记录时使用） */
export function getApplicableCheckItems(deviceId: string) {
  return requestClient.get<EquipmentApi.CheckItem[]>(
    `${CHECK_ITEM}/applicable`,
    { params: { deviceId } },
  );
}

export function addCheckItem(data: EquipmentApi.CheckItemForm) {
  return requestClient.post<null>(CHECK_ITEM, data);
}

export function updateCheckItem(data: EquipmentApi.CheckItemForm) {
  return requestClient.put<null>(CHECK_ITEM, data);
}

export function removeCheckItem(checkItemIds: string[]) {
  return requestClient.delete<null>(`${CHECK_ITEM}/${checkItemIds.join(',')}`);
}

// ---------------------------------------------------------------- 点检记录

export function listCheckRecord(query: EquipmentApi.CheckRecordQuery) {
  return requestClient.get<PageResult<EquipmentApi.CheckRecord>>(
    `${CHECK_RECORD}/list`,
    { params: query },
  );
}

export function getCheckRecord(checkRecordId: string) {
  return requestClient.get<EquipmentApi.CheckRecord>(
    `${CHECK_RECORD}/${checkRecordId}`,
  );
}

export function getCheckRecordLogs(checkRecordId: string) {
  return requestClient.get<MesApi.StatusLog[]>(
    `${CHECK_RECORD}/${checkRecordId}/logs`,
  );
}

export function addCheckRecord(data: EquipmentApi.CheckRecordForm) {
  return requestClient.post<null>(CHECK_RECORD, data);
}

/** 作废：原因必填 */
export function voidCheckRecord(checkRecordId: string, reason: string) {
  return requestClient.post<null>(`${CHECK_RECORD}/${checkRecordId}/void`, {
    reason,
  });
}

/** 点检异常发起安灯（设备异常类），每条记录只能发起一次 */
export function raiseCheckAndon(
  checkRecordId: string,
  data: EquipmentApi.CheckAndonForm,
) {
  return requestClient.post<null>(
    `${CHECK_RECORD}/${checkRecordId}/andon`,
    data,
  );
}

export function exportCheckRecord(
  query: EquipmentApi.CheckRecordQuery,
  fileName: string,
) {
  return exportExcel(`${CHECK_RECORD}/export`, { ...query }, fileName);
}

// ---------------------------------------------------------------- 保养计划

export function listMaintenancePlan(query: EquipmentApi.MaintenancePlanQuery) {
  return requestClient.get<PageResult<EquipmentApi.MaintenancePlan>>(
    `${PLAN}/list`,
    { params: query },
  );
}

export function getMaintenancePlan(planId: string) {
  return requestClient.get<EquipmentApi.MaintenancePlan>(`${PLAN}/${planId}`);
}

export function addMaintenancePlan(data: EquipmentApi.MaintenancePlanForm) {
  return requestClient.post<null>(PLAN, data);
}

export function updateMaintenancePlan(data: EquipmentApi.MaintenancePlanForm) {
  return requestClient.put<null>(PLAN, data);
}

export function removeMaintenancePlan(planIds: string[]) {
  return requestClient.delete<null>(`${PLAN}/${planIds.join(',')}`);
}

/** 为当前租户中已到生成日期的计划生成保养工单，返回生成的张数 */
export function generateMaintenanceOrders() {
  return requestClient.post<number>(`${PLAN}/generate`);
}

// ---------------------------------------------------------------- 保养工单

export function listMaintenanceOrder(
  query: EquipmentApi.MaintenanceOrderQuery,
) {
  return requestClient.get<PageResult<EquipmentApi.MaintenanceOrder>>(
    `${ORDER}/list`,
    { params: query },
  );
}

export function getMaintenanceOrder(orderId: string) {
  return requestClient.get<EquipmentApi.MaintenanceOrder>(
    `${ORDER}/${orderId}`,
  );
}

export function getMaintenanceOrderLogs(orderId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${ORDER}/${orderId}/logs`);
}

/** 开始保养：待保养 → 保养中 */
export function startMaintenanceOrder(orderId: string) {
  return requestClient.post<null>(`${ORDER}/${orderId}/start`);
}

/** 完成保养：保养中 → 已完成 */
export function completeMaintenanceOrder(
  orderId: string,
  data: EquipmentApi.MaintenanceCompleteForm,
) {
  return requestClient.post<null>(`${ORDER}/${orderId}/complete`, data);
}

/** 取消：原因必填 */
export function cancelMaintenanceOrder(orderId: string, reason: string) {
  return requestClient.post<null>(`${ORDER}/${orderId}/cancel`, { reason });
}

export function exportMaintenanceOrder(
  query: EquipmentApi.MaintenanceOrderQuery,
  fileName: string,
) {
  return exportExcel(`${ORDER}/export`, { ...query }, fileName);
}

// ---------------------------------------------------------------- OEE

export function getOee(query: EquipmentApi.OeeQuery) {
  return requestClient.get<EquipmentApi.Oee>(OEE, { params: query });
}

export function exportOee(query: EquipmentApi.OeeQuery, fileName: string) {
  return exportExcel(`${OEE}/export`, { ...query }, fileName);
}

export function getOeeConfig(
  targetType: EquipmentApi.OeeTargetType,
  targetId: string,
) {
  return requestClient.get<EquipmentApi.OeeConfig>(`${OEE}/config`, {
    params: { targetId, targetType },
  });
}

export function saveOeeConfig(data: EquipmentApi.OeeConfig) {
  return requestClient.put<null>(`${OEE}/config`, data);
}
