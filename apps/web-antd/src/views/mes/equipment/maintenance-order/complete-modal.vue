<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { completeMaintenanceOrder } from '@tuoyu/shared/api/mes/equipment';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useCompleteSchema } from './data';

/** 完成保养：填写实际内容、用时与更换的备件 */
const emit = defineEmits<{ success: [] }>();

const order = ref<EquipmentApi.MaintenanceOrder>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useCompleteSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!order.value) {
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      await completeMaintenanceOrder(
        order.value.orderId,
        (await formApi.getValues()) as EquipmentApi.MaintenanceCompleteForm,
      );
      message.success($t('mes.equipment.maintenanceOrder.completed'));
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
    order.value = (
      modalApi.getData() as { order: EquipmentApi.MaintenanceOrder }
    ).order;
    await formApi.resetForm();
    await formApi.setValues({ actualContent: order.value.maintenanceContent });
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.equipment.maintenanceOrder.complete')"
    :title="
      $t('mes.equipment.maintenanceOrder.completeTitle', {
        code: order?.orderCode ?? '',
      })
    "
    class="w-full max-w-[640px]"
  >
    <p class="text-muted-foreground mb-3">
      {{ $t('mes.equipment.maintenanceOrder.completeHelp') }}
    </p>
    <Form />
  </Modal>
</template>
