<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { raiseCheckAndon } from '@tuoyu/shared/api/mes/equipment';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';
import { ElInput, ElMessage, ElOption, ElSelect } from 'element-plus';

import { $t } from '#/locales';

/** 点检异常发起安灯：选择紧急程度（默认紧急），可以补充说明 */
const emit = defineEmits<{ success: [] }>();

const record = ref<EquipmentApi.CheckRecord>();
const eventLevel = ref('urgent');
const content = ref('');

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!record.value) {
      return;
    }
    modalApi.lock();
    try {
      const text = content.value.trim();
      await raiseCheckAndon(record.value.checkRecordId, {
        content: text || undefined,
        eventLevel: eventLevel.value,
      });
      ElMessage.success($t('mes.equipment.checkRecord.andonRaisedDone'));
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
    record.value = (
      modalApi.getData() as { record: EquipmentApi.CheckRecord }
    ).record;
    eventLevel.value = 'urgent';
    content.value = '';
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.equipment.checkRecord.andonConfirm')"
    :title="
      $t('mes.equipment.checkRecord.andonTitle', {
        code: record?.recordCode ?? '',
      })
    "
    class="w-full max-w-[520px]"
  >
    <p class="text-muted-foreground mb-3">
      {{ $t('mes.equipment.checkRecord.andonHelp') }}
    </p>
    <label class="mb-1 block">
      {{ $t('mes.equipment.checkRecord.eventLevel') }}
    </label>
    <ElSelect v-model="eventLevel" class="mb-3 w-full">
      <ElOption
        v-for="option in enumOptions('AndonLevel')"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>
    <label class="mb-1 block">
      {{ $t('mes.equipment.checkRecord.andonContent') }}
    </label>
    <ElInput
      v-model="content"
      :maxlength="200"
      :placeholder="$t('mes.equipment.checkRecord.andonContentPlaceholder')"
      :rows="3"
      show-word-limit
      type="textarea"
    />
  </Modal>
</template>
