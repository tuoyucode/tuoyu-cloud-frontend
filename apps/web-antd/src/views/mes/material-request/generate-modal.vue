<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { generateMaterialRequest } from '#/api/mes/materialRequest';
import { $t } from '#/locales';

import { useGenerateSchema } from './data';

/** 生成成功后传出新单据的 ID，列表页刷新并打开编辑抽屉 */
const emit = defineEmits<{ success: [requestId: string] }>();

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
      const values = await formApi.getValues();
      const requestId = await generateMaterialRequest({
        warehouseId: values.warehouseId,
        workorderId: values.workorderId,
      });
      message.success($t('mes.materialRequest.generated'));
      emit('success', String(requestId));
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
    :confirm-text="$t('mes.materialRequest.generate')"
    :title="$t('mes.materialRequest.generateTitle')"
    class="w-full max-w-[520px]"
  >
    <p class="text-muted-foreground mb-4">
      {{ $t('mes.materialRequest.generateHint') }}
    </p>
    <Form />
  </Modal>
</template>
