import type { ReasonModalData } from './data';

import type { WorkorderApi } from '#/api/mes/workorder';

import { message, Modal } from 'ant-design-vue';

import {
  cancelWorkorder,
  closeWorkorder,
  completeWorkorder,
  pauseWorkorder,
  releaseWorkorder,
  resumeWorkorder,
} from '#/api/mes/workorder';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

/** 工单的状态动作（权限码为 mes:workorder:<动作>） */
export type WorkorderAction =
  | 'cancel'
  | 'close'
  | 'complete'
  | 'pause'
  | 'release'
  | 'resume';

/** 各状态可以执行的动作，与后端的流转规则一致 */
const ACTIONS_BY_STATUS: Record<string, WorkorderAction[]> = {
  completed: ['close'],
  draft: ['release', 'cancel'],
  in_progress: ['pause', 'complete'],
  paused: ['resume'],
  released: ['pause', 'cancel'],
};

/** 按钮文字（写清动作） */
export const ACTION_LABEL_KEYS: Record<WorkorderAction, string> = {
  cancel: 'mes.workorder.cancelWorkorder',
  close: 'mes.workorder.closeWorkorder',
  complete: 'mes.workorder.completeWorkorder',
  pause: 'mes.workorder.pauseWorkorder',
  release: 'mes.workorder.releaseWorkorder',
  resume: 'mes.workorder.resumeWorkorder',
};

/** 危险动作（按钮标红） */
export const DANGER_ACTIONS = new Set<WorkorderAction>(['cancel']);

/** 当前状态下、当前用户有权限执行的动作 */
export function availableActions(status?: string): WorkorderAction[] {
  return (ACTIONS_BY_STATUS[status ?? ''] ?? []).filter((action) =>
    hasPermission(`mes:workorder:${action}`),
  );
}

/** 只有草稿可以修改、删除 */
export function isDraft(row?: Pick<WorkorderApi.Workorder, 'workorderStatus'>) {
  return row?.workorderStatus === 'draft';
}

/**
 * 执行工单的状态动作：确认类动作用确认框，需要原因的动作打开原因对话框
 *
 * @param openReason 打开原因对话框（reason-modal）
 * @param onDone 动作成功后的回调（刷新列表或详情）
 */
export function useWorkorderActions(
  openReason: (data: ReasonModalData) => void,
  onDone: () => void,
) {
  function confirmThen(
    content: string,
    okText: string,
    action: () => Promise<unknown>,
    successKey: string,
  ) {
    Modal.confirm({
      content,
      okText,
      async onOk() {
        await action();
        message.success($t(successKey));
        onDone();
      },
      title: okText,
    });
  }

  function withReason(
    data: Omit<ReasonModalData, 'submit'>,
    action: (reason: string) => Promise<unknown>,
    successKey: string,
  ) {
    openReason({
      ...data,
      async submit(reason) {
        await action(reason);
        message.success($t(successKey));
        onDone();
      },
    });
  }

  function run(action: WorkorderAction, row: WorkorderApi.Workorder) {
    const id = row.workorderId;
    const code = row.workorderCode;
    const okText = $t(ACTION_LABEL_KEYS[action]);
    switch (action) {
      case 'cancel': {
        withReason(
          {
            label: $t('mes.workorder.cancelReason'),
            okText,
            required: true,
            title: `${okText} ${code}`,
          },
          (reason) => cancelWorkorder(id, reason),
          'mes.workorder.cancelled',
        );
        break;
      }
      case 'close': {
        withReason(
          {
            label: $t('mes.workorder.closeReason'),
            okText,
            required: false,
            title: `${okText} ${code}`,
          },
          (reason) => closeWorkorder(id, reason || undefined),
          'mes.workorder.closed',
        );
        break;
      }
      case 'complete': {
        confirmThen(
          $t('mes.workorder.confirmComplete', { code }),
          okText,
          () => completeWorkorder(id),
          'mes.workorder.completed',
        );
        break;
      }
      case 'pause': {
        withReason(
          {
            label: $t('mes.workorder.pauseReason'),
            okText,
            required: true,
            title: `${okText} ${code}`,
          },
          (reason) => pauseWorkorder(id, reason),
          'mes.workorder.paused',
        );
        break;
      }
      case 'release': {
        confirmThen(
          $t('mes.workorder.confirmRelease', { code }),
          okText,
          () => releaseWorkorder(id),
          'mes.workorder.released',
        );
        break;
      }
      case 'resume': {
        confirmThen(
          $t('mes.workorder.confirmResume', { code }),
          okText,
          () => resumeWorkorder(id),
          'mes.workorder.resumed',
        );
        break;
      }
    }
  }

  return { run };
}
