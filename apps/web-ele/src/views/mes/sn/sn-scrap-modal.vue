<script lang="ts" setup>
import type { SnApi } from '@tuoyu/shared/api/mes/sn';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { scrapSn } from '@tuoyu/shared/api/mes/sn';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useScrapSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 要报废的序列号 */
const sn = ref<SnApi.Sn>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useScrapSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!sn.value) {
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const { reason } = await formApi.getValues();
      await scrapSn(sn.value.snId, reason as string);
      ElMessage.success($t('mes.sn.scrapped'));
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
    sn.value = modalApi.getData() as SnApi.Sn;
    await formApi.resetForm();
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.sn.scrap')"
    :title="$t('mes.sn.scrapTitle')"
    class="w-full max-w-[480px]"
  >
    <p v-if="sn" class="text-muted-foreground mb-4">
      {{ $t('mes.sn.scrapFor', { code: sn.snCode }) }}
    </p>
    <Form />
  </Modal>
</template>
