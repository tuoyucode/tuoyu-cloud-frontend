<script lang="ts" setup>
import type { OperationTaskApi } from '@tuoyu/shared/api/mes/operationTask';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { dispatchOperationTask } from '@tuoyu/shared/api/mes/operationTask';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useDispatchSchema } from './data';

/** 派工：选择工位、班组、作业人（至少一项）。打开时传入要派工的任务 */
const emit = defineEmits<{ success: [] }>();

const task = ref<OperationTaskApi.Task>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useDispatchSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const current = task.value;
    if (!current) {
      return;
    }
    const values = (await formApi.getValues()) as OperationTaskApi.Dispatch;
    if (!values.stationId && !values.teamId && !values.assigneeUserId) {
      message.warning($t('mes.operationTask.dispatchRequired'));
      return;
    }
    modalApi.lock();
    try {
      await dispatchOperationTask(current.taskId, {
        assigneeUserId: values.assigneeUserId || undefined,
        stationId: values.stationId || undefined,
        teamId: values.teamId || undefined,
      });
      message.success($t('mes.operationTask.dispatched'));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const current = modalApi.getData() as OperationTaskApi.Task;
    task.value = current;
    await formApi.resetForm();
    // 工位按任务的产线过滤（没有产线时列出全部，由后端校验是否属于工单车间），班组按车间过滤
    formApi.updateSchema([
      {
        componentProps: {
          params: current.lineId ? { lineId: current.lineId } : {},
        },
        fieldName: 'stationId',
      },
      {
        componentProps: { params: { workshopId: current.workshopId } },
        fieldName: 'teamId',
      },
    ]);
    await formApi.setValues({
      assigneeUserId: current.assigneeUserId,
      stationId: current.stationId,
      teamId: current.teamId,
    });
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.operationTask.dispatchConfirm')"
    :title="
      $t('mes.operationTask.dispatchTitle', {
        name: task ? `${task.seqNo} ${task.operationName}` : '',
      })
    "
    class="w-full max-w-[480px]"
  >
    <p class="text-muted-foreground mb-2">
      {{ $t('mes.operationTask.dispatchHelp') }}
    </p>
    <Form />
  </Modal>
</template>
