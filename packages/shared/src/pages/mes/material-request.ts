import type { ProcessDrawerData } from '../workflow/task-utils';

/** 完成领退料时一行的批次相关字段 */
export interface BatchRow {
  actualQty?: null | number;
  batchCode?: string;
  /** 物料的追溯方式：none、batch、sn */
  traceMode?: string;
}

/**
 * 按批次追溯（batch）、实发（实退）数量大于 0 的行必须填写物料批次号，与服务端的校验一致
 */
export function batchRequired(row: BatchRow) {
  return row.traceMode === 'batch' && Number(row.actualQty ?? 0) > 0;
}

/**
 * 第一个必须填写却没有填写物料批次号的行的下标，没有时为 -1
 */
export function firstMissingBatch(rows: BatchRow[]) {
  return rows.findIndex((row) => batchRequired(row) && !row.batchCode?.trim());
}

/** 审批中（不良记录与领退料单的状态值相同） */
export const APPROVING = 'approving';

/** 单据当前是否在审批中 */
export function isApproving(status?: null | string) {
  return status === APPROVING;
}

/** 单据是否发起过审批（有审批记录可以查看） */
export function hasApproval(row: { approvalBusinessId?: null | string }) {
  return !!row.approvalBusinessId;
}

/**
 * 查看审批：框架流程抽屉的只读参数（按业务 ID 读取审批记录与流程图）
 *
 * @param businessId 单据保存的审批业务 ID
 * @param businessCode 单据编号，显示在抽屉的摘要中
 */
export function approvalDrawerData(
  businessId: string,
  businessCode: string,
): ProcessDrawerData {
  return { businessId, summary: { businessCode } };
}

/**
 * 处置或提交后的提示：已提交审批时与直接完成时不同
 *
 * @param status 接口返回的状态
 * @param approvingKey 已提交审批时的文案键
 * @param doneKey 直接完成时的文案键
 */
export function resultMessageKey(
  status: null | string | undefined,
  approvingKey: string,
  doneKey: string,
) {
  return isApproving(status) ? approvingKey : doneKey;
}
