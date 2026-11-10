import type { TaskApi } from '@tuoyu/shared/api/workflow/task';

/**
 * 流程详情与办理抽屉的参数：传入 taskId 且 approve 为 true 时可以办理
 */
export interface ProcessDrawerData {
  approve?: boolean;
  businessId: string;
  /** 流程定义的表单路径：views 下业务详情组件的路径，抽屉中以“业务详情”页签展示 */
  formPath?: string;
  instanceId?: string;
  summary?: {
    businessCode?: string;
    businessTitle?: string;
    createByName?: string;
    createTime?: string;
    flowName?: string;
    flowStatus?: string;
    nodeName?: string;
  };
  taskId?: string;
}

/**
 * 表单路径规范化为 views 下的页面路径（不带开头的 / 与 .vue），规则与菜单的 component 相同，例如
 * "mes/material-request/approval-detail" 对应 views/mes/material-request/approval-detail.vue。
 * 空路径与包含 ..、反斜杠的路径返回 undefined
 */
export function businessFormPath(formPath?: string): string | undefined {
  const path = formPath
    ?.trim()
    .replace(/^\/+/, '')
    .replace(/\.vue$/, '');
  if (!path || path.includes('..') || path.includes('\\')) {
    return undefined;
  }
  return path;
}

/** 任务状态：待审核（审批记录中尚未处理的任务） */
export const TASK_WAITING = 'waiting';

/** 已结束的流程状态（BusinessStatusEnum.finishStatus）：已完成、已作废、已终止 */
const FINISHED_STATUSES = new Set(['finish', 'invalid', 'termination']);

/** 流程是否已结束；已结束的流程实例用“删除历史”接口删除 */
export function isFinishedStatus(flowStatus?: string) {
  return !!flowStatus && FINISHED_STATUSES.has(flowStatus);
}

/** 申请人可以撤销的流程：待审核 */
export function canCancel(flowStatus?: string) {
  return flowStatus === TASK_WAITING;
}

/** 通知方式：1 站内信，2 邮件，3 短信（MessageTypeEnum） */
export const MESSAGE_TYPES = ['1', '2', '3'] as const;

/** 默认的通知方式：站内信 */
export const DEFAULT_MESSAGE_TYPES = ['1'];

/** 节点上显示的按钮编码 */
export function visibleButtonCodes(
  buttons?: TaskApi.ButtonPermission[],
): Set<string> {
  return new Set(
    (buttons ?? [])
      .filter((button) => button.show)
      .map((button) => button.code),
  );
}

/**
 * 从节点的办理人配置中取出流程变量名：${name} → name；不是变量时返回 undefined。
 * 弹窗选人时，选中的用户以“变量名 → 用户 ID”的形式提交（assigneeMap）
 */
export function variableName(permissionFlag?: string): string | undefined {
  const match = /^\$\{\s*([\w.]+)\s*\}$/.exec((permissionFlag ?? '').trim());
  return match?.[1];
}

/**
 * 组装弹窗选人的结果：只提交选了用户、且办理人配置为流程变量的节点
 *
 * @param nodes 下一节点
 * @param selected 节点编码 → 选中的用户 ID
 */
export function buildAssigneeMap(
  nodes: TaskApi.FlowNode[],
  selected: Record<string, string[]>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const node of nodes) {
    const name = variableName(node.permissionFlag);
    const userIds = selected[node.nodeCode] ?? [];
    if (name && userIds.length > 0) {
      result[name] = userIds.join(',');
    }
  }
  return result;
}

/**
 * 弹窗选人时还没有选择办理人的节点（办理人为流程变量的节点必须选择）
 */
export function missingAssigneeNodes(
  nodes: TaskApi.FlowNode[],
  selected: Record<string, string[]>,
): TaskApi.FlowNode[] {
  return nodes.filter(
    (node) =>
      !!variableName(node.permissionFlag) &&
      (selected[node.nodeCode] ?? []).length === 0,
  );
}

/** 业务的显示名称：标题 > 编码 > 业务 ID */
export function businessLabel(item: {
  businessCode?: string;
  businessId?: string;
  businessTitle?: string;
}) {
  return item.businessTitle || item.businessCode || item.businessId || '';
}
