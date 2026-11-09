<script lang="ts" setup>
import type { ReasonModalData } from './data';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Input, message } from 'ant-design-vue';

import { $t } from '#/locales';

/**
 * 填写原因后执行状态动作（暂停、取消、关闭工单，撤销报工等）。
 * 打开时传入 ReasonModalData；提交成功后关闭并触发 success
 */
const emit = defineEmits<{ success: [] }>();

const reason = ref('');
const options = ref<ReasonModalData>();

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const current = options.value;
    if (!current) {
      return;
    }
    const text = reason.value.trim();
    if (current.required && !text) {
      message.warning($t('mes.workorder.reasonRequired'));
      return;
    }
    modalApi.lock();
    try {
      await current.submit(text);
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    options.value = modalApi.getData() as ReasonModalData;
    reason.value = '';
  },
});
</script>

<template>
  <Modal
    :confirm-text="options?.okText"
    :title="options?.title"
    class="w-full max-w-[480px]"
  >
    <p v-if="options?.description" class="text-muted-foreground mb-3">
      {{ options.description }}
    </p>
    <label class="mb-1 block">
      <span v-if="options?.required" class="text-destructive mr-1">*</span>
      {{ options?.label }}
    </label>
    <Input.TextArea
      v-model:value="reason"
      :maxlength="500"
      :placeholder="
        options?.required
          ? $t('mes.workorder.reasonRequiredPlaceholder')
          : $t('mes.workorder.reasonPlaceholder')
      "
      :rows="4"
      show-count
    />
  </Modal>
</template>
