<script lang="ts" setup>
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { EquipmentEnumType } from '@tuoyu/shared/pages/mes/equipment-enums';

import type { TagType } from '../../_shared/tag-type';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { equipmentEnumLabel } from '@tuoyu/shared/pages/mes/equipment-enums';
import {
  actionLabel,
  statusChange,
} from '@tuoyu/shared/pages/mes/equipment-utils';
import { ElEmpty, ElTimeline, ElTimelineItem } from 'element-plus';

import { $t } from '#/locales';

/** 状态履历对话框。打开时传入 { title, statusType, load } */
interface OpenData {
  load: () => Promise<MesApi.StatusLog[]>;
  statusType: EquipmentEnumType;
  title: string;
}

const title = ref('');
const statusType = ref<EquipmentEnumType>('CheckRecordStatus');
const logs = ref<MesApi.StatusLog[]>([]);

const [Modal, modalApi] = useVbenModal({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData() as OpenData;
    title.value = data.title;
    statusType.value = data.statusType;
    logs.value = [];
    modalApi.setState({ loading: true });
    try {
      logs.value = await data.load();
    } finally {
      modalApi.setState({ loading: false });
    }
  },
});

function statusText(log: MesApi.StatusLog) {
  return statusChange(log, (value) =>
    equipmentEnumLabel(statusType.value, value),
  );
}

/** 节点颜色：作废、取消、发起安灯用警告色，完成用成功色，其他用主色 */
function type(action: string): TagType {
  if (['andon', 'cancel', 'void'].includes(action)) {
    return 'warning';
  }
  return action === 'complete' ? 'success' : 'primary';
}
</script>

<template>
  <Modal :title="title" class="w-full max-w-[560px]">
    <ElEmpty
      v-if="logs.length === 0"
      :description="$t('mes.equipment.common.noLogs')"
      :image-size="60"
    />
    <ElTimeline v-else class="pt-2">
      <ElTimelineItem
        v-for="log in logs"
        :key="log.logId"
        :type="type(log.action)"
      >
        <div class="flex flex-wrap items-baseline gap-x-3">
          <span class="font-medium">{{ actionLabel(log.action) }}</span>
          <span>{{ statusText(log) }}</span>
        </div>
        <div class="text-muted-foreground text-xs">
          {{ log.operateTime }}
          <template v-if="log.operatorName">· {{ log.operatorName }}</template>
        </div>
        <div v-if="log.reason" class="mt-1 whitespace-pre-wrap break-all">
          {{ log.reason }}
        </div>
      </ElTimelineItem>
    </ElTimeline>
  </Modal>
</template>
