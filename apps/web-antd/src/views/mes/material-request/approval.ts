import type { ProcessDrawerData } from '#/views/workflow/task/task-utils';

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
