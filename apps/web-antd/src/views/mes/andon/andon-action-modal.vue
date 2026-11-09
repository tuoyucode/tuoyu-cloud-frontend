<script lang="ts" setup>
import type { AndonApi } from '@tuoyu/shared/api/mes/andon';

import type { AndonAction } from './data';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  assignAndon,
  closeAndon,
  resolveAndon,
} from '@tuoyu/shared/api/mes/andon';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useAssignSchema, useCloseSchema, useResolveSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const action = ref<AndonAction>('assign');
const event = ref<AndonApi.Event>();

const formOptions = {
  layout: 'vertical' as const,
  showDefaultActions: false,
};

const [AssignForm, assignFormApi] = useVbenForm({
  ...formOptions,
  schema: useAssignSchema(),
});
const [ResolveForm, resolveFormApi] = useVbenForm({
  ...formOptions,
  schema: useResolveSchema(),
});
const [CloseForm, closeFormApi] = useVbenForm({
  ...formOptions,
  schema: useCloseSchema(false),
});

const reassign = computed(() => event.value?.eventStatus === 'assigned');

const title = computed(() => {
  switch (action.value) {
    case 'assign': {
      return reassign.value
        ? $t('mes.andon.reassignTitle')
        : $t('mes.andon.assignTitle');
    }
    case 'close': {
      return $t('mes.andon.closeTitle');
    }
    default: {
      return $t('mes.andon.resolveTitle');
    }
  }
});

const confirmText = computed(() => {
  switch (action.value) {
    case 'assign': {
      return reassign.value ? $t('mes.andon.reassign') : $t('mes.andon.assign');
    }
    case 'close': {
      return $t('mes.andon.close');
    }
    default: {
      return $t('mes.andon.resolve');
    }
  }
});

function currentForm() {
  switch (action.value) {
    case 'assign': {
      return assignFormApi;
    }
    case 'close': {
      return closeFormApi;
    }
    default: {
      return resolveFormApi;
    }
  }
}

async function submit(eventId: string) {
  switch (action.value) {
    case 'assign': {
      const { handlerUserId } = await assignFormApi.getValues();
      await assignAndon(eventId, handlerUserId as string);
      message.success($t('mes.andon.assigned'));
      break;
    }
    case 'close': {
      const { reason } = await closeFormApi.getValues();
      await closeAndon(eventId, (reason as string | undefined) || undefined);
      message.success($t('mes.andon.closed'));
      break;
    }
    default: {
      const values = await resolveFormApi.getValues();
      await resolveAndon(eventId, {
        downtimeReasonId: values.downtimeReasonId as string | undefined,
        resolveRemark: values.resolveRemark as string,
      });
      message.success($t('mes.andon.resolved'));
    }
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!event.value) {
      return;
    }
    const { valid } = await currentForm().validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      await submit(event.value.eventId);
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
    const data = modalApi.getData() as {
      action: AndonAction;
      event: AndonApi.Event;
    };
    action.value = data.action;
    event.value = data.event;
    const form = currentForm();
    await form.resetForm();
    if (data.action === 'close') {
      // 已上报的事件直接关闭（误报）时必须填写原因
      closeFormApi.setState({
        schema: useCloseSchema(data.event.eventStatus === 'reported'),
      });
    } else if (data.action === 'resolve' && data.event.downtimeReasonId) {
      await resolveFormApi.setValues({
        downtimeReasonId: data.event.downtimeReasonId,
      });
    } else if (data.action === 'assign' && data.event.handlerUserId) {
      await assignFormApi.setValues({
        handlerUserId: data.event.handlerUserId,
      });
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="confirmText"
    :title="title"
    class="w-full max-w-[480px]"
  >
    <p v-if="event" class="text-muted-foreground mb-4">
      {{ event.eventCode }} · {{ event.title }}
    </p>
    <AssignForm v-show="action === 'assign'" />
    <ResolveForm v-show="action === 'resolve'" />
    <CloseForm v-show="action === 'close'" />
  </Modal>
</template>
