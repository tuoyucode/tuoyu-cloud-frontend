<script lang="ts" setup>
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { MesEnumType } from '@tuoyu/shared/pages/mes/enums';

import { enumLabel } from '@tuoyu/shared/pages/mes/enums';
import { Empty, Timeline, TimelineItem } from 'ant-design-vue';

import { $t } from '#/locales';

/** 状态履历时间线：动作、状态变化、操作人、时间与原因 */
const props = defineProps<{
  logs: MesApi.StatusLog[];
  /** 状态的枚举类型，用于显示状态文案 */
  statusType: MesEnumType;
}>();

function actionLabel(action: string) {
  const key = `mes.workorder.actions.${action}`;
  const label = $t(key);
  return label === key ? action : label;
}

function statusChange(log: MesApi.StatusLog) {
  const to = enumLabel(props.statusType, log.toStatus);
  return log.fromStatus
    ? `${enumLabel(props.statusType, log.fromStatus)} → ${to}`
    : to;
}

function color(action: string) {
  if (['cancel', 'pause'].includes(action)) {
    return 'orange';
  }
  if (['auto_complete', 'complete', 'confirm'].includes(action)) {
    return 'green';
  }
  return 'blue';
}
</script>

<template>
  <Empty
    v-if="logs.length === 0"
    :description="$t('mes.workorder.noLogs')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <Timeline v-else class="pt-2">
    <TimelineItem
      v-for="log in logs"
      :key="log.logId"
      :color="color(log.action)"
    >
      <div class="flex flex-wrap items-baseline gap-x-3">
        <span class="font-medium">{{ actionLabel(log.action) }}</span>
        <span>{{ statusChange(log) }}</span>
      </div>
      <div class="text-muted-foreground text-xs">
        {{ log.operateTime }}
        <template v-if="log.operatorName">· {{ log.operatorName }}</template>
      </div>
      <div v-if="log.reason" class="mt-1 whitespace-pre-wrap break-all">
        {{ log.reason }}
      </div>
    </TimelineItem>
  </Timeline>
</template>
