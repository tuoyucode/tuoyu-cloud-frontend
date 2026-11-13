<script lang="ts" setup>
import type { ReasonModalData } from '@tuoyu/shared/pages/mes/equipment-utils';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElInput, ElMessage } from 'element-plus';

import { $t } from '#/locales';

/** 填写原因后执行的动作（作废点检记录、取消保养工单）；打开时传入 ReasonModalData，成功后关闭并触发 success */
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
    if (!text) {
      ElMessage.warning($t('mes.equipment.common.reasonRequired'));
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
      <span class="text-destructive mr-1">*</span>
      {{ $t('mes.equipment.common.reason') }}
    </label>
    <ElInput
      v-model="reason"
      :maxlength="500"
      :placeholder="$t('mes.equipment.common.reasonPlaceholder')"
      :rows="4"
      show-word-limit
      type="textarea"
    />
  </Modal>
</template>
