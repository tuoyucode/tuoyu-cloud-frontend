<script lang="ts" setup>
import type { DefectApi } from '@tuoyu/shared/api/mes/defect';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { handleDefect } from '@tuoyu/shared/api/mes/defect';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

import { useHandleSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 要处置的不良记录 */
const defect = ref<DefectApi.Defect>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useHandleSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!defect.value) {
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const values = (await formApi.getValues()) as DefectApi.HandleForm;
      await handleDefect(defect.value.defectId, values);
      message.success($t('mes.defect.handled'));
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
    defect.value = modalApi.getData() as DefectApi.Defect;
    await formApi.resetForm();
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.defect.handle')"
    :title="$t('mes.defect.handleTitle')"
    class="w-full max-w-[520px]"
  >
    <div v-if="defect" class="mb-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{{ defect.defectCode }}</span>
        <EnumTag :value="defect.defectLevel" type="DefectLevel" />
        <span class="text-muted-foreground">
          {{ defect.workorderCode }}
          <template v-if="defect.operationName">
            · {{ defect.operationName }}
          </template>
          ·
          {{
            $t('mes.defect.qtyText', { qty: String(Number(defect.defectQty)) })
          }}
        </span>
      </div>
      <p v-if="defect.description" class="text-muted-foreground mt-2 text-sm">
        {{ defect.description }}
      </p>
    </div>
    <Form />
  </Modal>
</template>
