<script lang="ts" setup>
import type { InspectionApi } from '@tuoyu/shared/api/mes/inspection';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  getInspection,
  inspectInspection,
} from '@tuoyu/shared/api/mes/inspection';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

import { useResultSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const inspection = ref<InspectionApi.Inspection>();

/** 两个数量之和与检验数比较时允许的误差（数量最多 6 位小数） */
const EPSILON = 1e-7;

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    // 改了检验数或不良数时，合格数按“检验数 − 不良数”带出
    if (
      fieldsChanged.includes('inspectQty') ||
      fieldsChanged.includes('defectQty')
    ) {
      const inspect = Number(values.inspectQty ?? 0);
      const defect = Number(values.defectQty ?? 0);
      const qualified = Math.max(0, Number((inspect - defect).toFixed(6)));
      formApi.setFieldValue('qualifiedQty', qualified);
      if (fieldsChanged.includes('defectQty') && defect > 0) {
        formApi.setFieldValue('inspectionResult', 'rejected');
      }
    }
  },
  layout: 'vertical',
  schema: useResultSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-3 gap-x-4',
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!inspection.value) {
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const values = (await formApi.getValues()) as InspectionApi.ResultForm;
    const inspect = Number(values.inspectQty);
    if (inspect <= 0) {
      ElMessage.warning($t('mes.inspection.inspectQtyPositive'));
      return;
    }
    if (
      Math.abs(
        Number(values.qualifiedQty) + Number(values.defectQty) - inspect,
      ) > EPSILON
    ) {
      ElMessage.warning($t('mes.inspection.qtyMismatch'));
      return;
    }
    modalApi.lock();
    try {
      await inspectInspection(inspection.value.inspectionId, values);
      ElMessage.success(
        values.inspectionResult === 'rejected' && Number(values.defectQty) > 0
          ? $t('mes.inspection.inspectedWithDefect')
          : $t('mes.inspection.inspected'),
      );
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
    const { inspectionId } = modalApi.getData() as { inspectionId: string };
    inspection.value = undefined;
    await formApi.resetForm();
    modalApi.lock();
    try {
      const detail = await getInspection(inspectionId);
      inspection.value = detail;
      const inspectQty =
        detail.inspectQty === undefined || detail.inspectQty === null
          ? undefined
          : Number(detail.inspectQty);
      await formApi.setValues({
        defectQty: 0,
        inspectionResult: 'passed',
        inspectQty,
        qualifiedQty: inspectQty,
      });
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.inspection.inspect')"
    :title="$t('mes.inspection.inspectTitle')"
    class="w-full max-w-[720px]"
  >
    <template v-if="inspection">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="font-medium">{{ inspection.inspectionCode }}</span>
        <EnumTag :value="inspection.inspectionType" type="InspectionType" />
        <span class="text-muted-foreground">
          {{ inspection.workorderCode }}
          <template v-if="inspection.operationName">
            · {{ inspection.operationName }}
          </template>
          · {{ inspection.materialName }}
        </span>
      </div>
      <div class="bg-muted mb-4 rounded p-3">
        <div class="mb-1 font-medium">
          {{ $t('mes.inspection.checkItems') }}
          <span v-if="inspection.schemeName" class="text-muted-foreground">
            （{{ inspection.schemeName }}）
          </span>
        </div>
        <pre
          v-if="inspection.checkItems"
          class="m-0 whitespace-pre-wrap font-sans text-sm"
          >{{ inspection.checkItems }}</pre>
        <span v-else class="text-muted-foreground text-sm">
          {{ $t('mes.inspection.noCheckItems') }}
        </span>
      </div>
    </template>
    <Form />
  </Modal>
</template>
