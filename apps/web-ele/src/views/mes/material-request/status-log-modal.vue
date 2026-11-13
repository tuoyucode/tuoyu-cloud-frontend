<script lang="ts" setup>
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { StatusLogModalData } from '@tuoyu/shared/pages/mes/status-log';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElEmpty, ElTimeline, ElTimelineItem } from 'element-plus';

import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

const options = ref<StatusLogModalData>();
const logs = ref<MesApi.StatusLog[]>([]);
const loading = ref(false);

const [Modal, modalApi] = useVbenModal({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    options.value = modalApi.getData() as StatusLogModalData;
    logs.value = [];
    loading.value = true;
    try {
      logs.value = await options.value.load();
    } finally {
      loading.value = false;
    }
  },
});

/** 动作文案；未知的动作原样显示 */
function actionLabel(action: string) {
  const key = `mes.materialRequest.log.actions.${action}`;
  const label = $t(key);
  return label === key ? action : label;
}
</script>

<template>
  <Modal :title="options?.title" class="w-full max-w-[560px]">
    <div v-loading="loading" class="min-h-24">
      <ElEmpty v-if="!loading && logs.length === 0" />
      <ElTimeline v-else class="pt-2">
        <ElTimelineItem v-for="log in logs" :key="log.logId" type="primary">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">{{ actionLabel(log.action) }}</span>
            <template v-if="options">
              <EnumTag
                v-if="log.fromStatus"
                :type="options.enumType"
                :value="log.fromStatus"
              />
              <span v-if="log.fromStatus" class="text-muted-foreground">
                →
              </span>
              <EnumTag :type="options.enumType" :value="log.toStatus" />
            </template>
          </div>
          <div class="text-muted-foreground mt-1 text-sm">
            {{ log.operateTime }}
            <span v-if="log.operatorName" class="ml-2">
              {{ log.operatorName }}
            </span>
          </div>
          <div v-if="log.reason" class="mt-1 text-sm">
            {{ $t('mes.materialRequest.log.reason', { reason: log.reason }) }}
          </div>
        </ElTimelineItem>
      </ElTimeline>
    </div>
  </Modal>
</template>
