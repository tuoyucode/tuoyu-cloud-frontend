<script lang="ts" setup>
import type { AndonApi } from '@tuoyu/shared/api/mes/andon';
import type { MesApi } from '@tuoyu/shared/api/mes/common';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getAndon, getAndonLogs } from '@tuoyu/shared/api/mes/andon';
import { enumLabel } from '@tuoyu/shared/pages/mes/enums';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import {
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';

import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import { formatMinutes } from './data';

const event = ref<AndonApi.Event>();
const logs = ref<MesApi.StatusLog[]>([]);

/** 描述列表的列数：小屏以上 2 列，更窄 1 列 */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isSm = breakpoints.greaterOrEqual('sm');
const columns = computed(() => (isSm.value ? 2 : 1));

function actionLabel(action: string) {
  const key = `mes.andon.actions.${action}`;
  const label = $t(key);
  return label === key ? action : label;
}

function statusChange(log: MesApi.StatusLog) {
  const to = enumLabel('AndonStatus', log.toStatus);
  return log.fromStatus
    ? `${enumLabel('AndonStatus', log.fromStatus)} → ${to}`
    : to;
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const { eventId } = drawerApi.getData() as { eventId: string };
    event.value = undefined;
    logs.value = [];
    drawerApi.setState({ loading: true });
    try {
      const [detail, history] = await Promise.all([
        getAndon(eventId),
        getAndonLogs(eventId),
      ]);
      event.value = detail;
      logs.value = history;
    } finally {
      drawerApi.setState({ loading: false });
    }
  },
});
</script>

<template>
  <Drawer :title="$t('mes.andon.detailTitle')" class="w-full max-w-[760px]">
    <template v-if="event">
      <ElDescriptions :column="columns" border size="small">
        <ElDescriptionsItem :label="$t('mes.andon.eventCode')">
          <span class="font-mono">{{ event.eventCode }}</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('crud.status')">
          <EnumTag :value="event.eventStatus" type="AndonStatus" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.eventType')">
          <EnumTag :value="event.eventType" type="AndonType" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.eventLevel')">
          <EnumTag :value="event.eventLevel" type="AndonLevel" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.title')" :span="columns">
          {{ event.title }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.content')" :span="columns">
          <span class="whitespace-pre-wrap break-all">{{ event.content }}</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.workshop')">
          {{ event.workshopName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.line')">
          {{ event.lineName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.station')">
          {{ event.stationName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.device')">
          {{ event.deviceName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.workorder')">
          {{ event.workorderCode }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.downtimeReason')">
          {{ event.downtimeReasonName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.reportUser')">
          {{ event.reportUserName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.reportTime')">
          {{ event.reportTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.handler')">
          {{ event.handlerUserName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.assignTime')">
          {{ event.assignTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.responseTime')">
          {{ event.responseTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.resolveTime')">
          {{ event.resolveTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.responseDueTime')">
          {{ event.responseDueTime ?? $t('mes.andon.noDeadline') }}
          <span v-if="event.responseOverdueTime" class="text-destructive ml-2">
            {{ $t('mes.andon.overdueAt', { time: event.responseOverdueTime }) }}
          </span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.resolveDueTime')">
          {{ event.resolveDueTime ?? $t('mes.andon.noDeadline') }}
          <span v-if="event.resolveOverdueTime" class="text-destructive ml-2">
            {{ $t('mes.andon.overdueAt', { time: event.resolveOverdueTime }) }}
          </span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.escalation')">
          {{
            $t('mes.andon.escalatedTimes', { count: event.escalateCount ?? 0 })
          }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.duration')">
          {{ formatMinutes(event.durationMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.andon.downtimeMinutes')">
          {{ formatMinutes(event.downtimeMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem
          :label="$t('mes.andon.resolveRemark')"
          :span="columns"
        >
          <span class="whitespace-pre-wrap break-all">
            {{ event.resolveRemark }}
          </span>
        </ElDescriptionsItem>
      </ElDescriptions>

      <h3 class="mb-2 mt-6 font-medium">{{ $t('mes.andon.logs') }}</h3>
      <ElEmpty
        v-if="logs.length === 0"
        :description="$t('mes.andon.noLogs')"
        :image-size="60"
      />
      <ElTimeline v-else class="pt-2">
        <ElTimelineItem v-for="log in logs" :key="log.logId" type="primary">
          <div class="flex flex-wrap items-baseline gap-x-3">
            <span class="font-medium">{{ actionLabel(log.action) }}</span>
            <span>{{ statusChange(log) }}</span>
          </div>
          <div class="text-muted-foreground text-xs">
            {{ log.operateTime }}
            <template v-if="log.operatorName">
              · {{ log.operatorName }}
            </template>
          </div>
          <div v-if="log.reason" class="mt-1 whitespace-pre-wrap break-all">
            {{ log.reason }}
          </div>
        </ElTimelineItem>
      </ElTimeline>
    </template>
  </Drawer>
</template>
