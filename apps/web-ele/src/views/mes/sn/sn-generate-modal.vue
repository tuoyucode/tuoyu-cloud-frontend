<script lang="ts" setup>
import type { SnApi } from '@tuoyu/shared/api/mes/sn';

import { useVbenModal } from '@vben/common-ui';

import { generateSn } from '@tuoyu/shared/api/mes/sn';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useGenerateSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useGenerateSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const values = (await formApi.getValues()) as SnApi.Generate;
      await generateSn({
        count: Number(values.count),
        workorderId: values.workorderId,
      });
      ElMessage.success($t('mes.sn.generated', { count: values.count }));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      await formApi.resetForm();
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.sn.generate')"
    :title="$t('mes.sn.generateTitle')"
    class="w-full max-w-[480px]"
  >
    <p class="text-muted-foreground mb-4">{{ $t('mes.sn.generateHint') }}</p>
    <Form />
  </Modal>
</template>
