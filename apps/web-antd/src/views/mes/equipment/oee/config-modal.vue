<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { getOeeConfig, saveOeeConfig } from '@tuoyu/shared/api/mes/equipment';
import { trimDecimal } from '@tuoyu/shared/pages/mes/decimal';
import { toNumber } from '@tuoyu/shared/pages/mes/equipment-utils';
import { Input, InputNumber, message } from 'ant-design-vue';

import { $t } from '#/locales';

/** OEE 配置：每日计划生产时间与标准节拍，两项都可以留空 */
const emit = defineEmits<{ success: [] }>();

interface OpenData {
  name: string;
  targetId: string;
  targetType: EquipmentApi.OeeTargetType;
}

const target = ref<OpenData>();
const plannedMinutes = ref<number>();
const cycleMinutes = ref<number>();
const remark = ref('');

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!target.value) {
      return;
    }
    modalApi.lock();
    try {
      await saveOeeConfig({
        // 留空表示未配置：提交 null，后端据此清空
        cycleMinutes: cycleMinutes.value ?? null,
        plannedMinutes: plannedMinutes.value ?? null,
        remark: remark.value.trim() || undefined,
        targetId: target.value.targetId,
        targetType: target.value.targetType,
      });
      message.success($t('mes.equipment.oee.configSaved'));
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
    target.value = modalApi.getData() as OpenData;
    plannedMinutes.value = undefined;
    cycleMinutes.value = undefined;
    remark.value = '';
    modalApi.lock();
    try {
      const config = await getOeeConfig(
        target.value.targetType,
        target.value.targetId,
      );
      plannedMinutes.value = toNumber(config.plannedMinutes);
      cycleMinutes.value = toNumber(config.cycleMinutes);
      remark.value = config.remark ?? '';
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('crud.save')"
    :title="$t('mes.equipment.oee.configTitle', { name: target?.name ?? '' })"
    class="w-full max-w-[520px]"
  >
    <p class="text-muted-foreground mb-3">
      {{ $t('mes.equipment.oee.configHelp') }}
    </p>
    <label class="mb-1 block">
      {{ $t('mes.equipment.oee.plannedMinutes') }}
    </label>
    <InputNumber
      v-model:value="plannedMinutes"
      :max="1440"
      :min="1"
      :precision="0"
      class="mb-3 w-full"
    />
    <label class="mb-1 block">{{ $t('mes.equipment.oee.cycleMinutes') }}</label>
    <InputNumber
      v-model:value="cycleMinutes"
      :min="0.0001"
      :precision="4"
      :formatter="trimDecimal"
      class="w-full"
    />
    <p class="text-muted-foreground mb-3 mt-1 text-xs">
      {{ $t('mes.equipment.oee.cycleMinutesHelp') }}
    </p>
    <label class="mb-1 block">{{ $t('crud.remark') }}</label>
    <Input.TextArea v-model:value="remark" :maxlength="500" :rows="2" />
  </Modal>
</template>
