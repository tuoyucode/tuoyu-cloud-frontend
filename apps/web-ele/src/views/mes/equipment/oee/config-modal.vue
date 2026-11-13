<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { getOeeConfig, saveOeeConfig } from '@tuoyu/shared/api/mes/equipment';
import { trimFixedDecimal } from '@tuoyu/shared/pages/mes/decimal';
import { toNumber } from '@tuoyu/shared/pages/mes/equipment-utils';
import { ElInput, ElInputNumber, ElMessage } from 'element-plus';

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
      ElMessage.success($t('mes.equipment.oee.configSaved'));
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

/** 清空数值框时 Element Plus 给出 null，统一存为 undefined（提交时转为 null） */
function onPlanned(value?: null | number) {
  plannedMinutes.value = value ?? undefined;
}

/** 标准节拍保留 4 位小数（与后端一致），失去焦点后去掉末尾多余的 0 */
const cycleFormatter = trimFixedDecimal(4);

function onCycle(value?: null | number) {
  cycleMinutes.value = value ?? undefined;
}
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
    <ElInputNumber
      :max="1440"
      :min="1"
      :model-value="plannedMinutes"
      :precision="0"
      class="mb-3 w-full!"
      controls-position="right"
      @update:model-value="onPlanned"
    />
    <label class="mb-1 block">{{ $t('mes.equipment.oee.cycleMinutes') }}</label>
    <ElInputNumber
      :formatter="cycleFormatter"
      :min="0.0001"
      :model-value="cycleMinutes"
      :precision="4"
      class="w-full!"
      controls-position="right"
      @update:model-value="onCycle"
    />
    <p class="text-muted-foreground mb-3 mt-1 text-xs">
      {{ $t('mes.equipment.oee.cycleMinutesHelp') }}
    </p>
    <label class="mb-1 block">{{ $t('crud.remark') }}</label>
    <ElInput
      v-model="remark"
      :maxlength="500"
      :rows="2"
      show-word-limit
      type="textarea"
    />
  </Modal>
</template>
