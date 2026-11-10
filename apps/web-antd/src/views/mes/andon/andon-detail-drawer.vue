<script lang="ts" setup>
import type { AndonApi } from '@tuoyu/shared/api/mes/andon';
import type { MesApi } from '@tuoyu/shared/api/mes/common';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getAndon, getAndonLogs } from '@tuoyu/shared/api/mes/andon';
import {
  Descriptions,
  DescriptionsItem,
  Empty,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import { enumLabel } from '../_shared/enums';
import { formatMinutes } from './data';

const event = ref<AndonApi.Event>();
const logs = ref<MesApi.StatusLog[]>([]);

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
      <Descriptions :column="{ xs: 1, sm: 2 }" bordered size="small">
        <DescriptionsItem :label="$t('mes.andon.eventCode')">
          <span class="font-mono">{{ event.eventCode }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('crud.status')">
          <EnumTag :value="event.eventStatus" type="AndonStatus" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.eventType')">
          <EnumTag :value="event.eventType" type="AndonType" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.eventLevel')">
          <EnumTag :value="event.eventLevel" type="AndonLevel" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.title')" :span="2">
          {{ event.title }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.content')" :span="2">
          <span class="whitespace-pre-wrap break-all">{{ event.content }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.workshop')">
          {{ event.workshopName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.line')">
          {{ event.lineName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.station')">
          {{ event.stationName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.device')">
          {{ event.deviceName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.workorder')">
          {{ event.workorderCode }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.downtimeReason')">
          {{ event.downtimeReasonName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.reportUser')">
          {{ event.reportUserName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.reportTime')">
          {{ event.reportTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.handler')">
          {{ event.handlerUserName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.assignTime')">
          {{ event.assignTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.responseTime')">
          {{ event.responseTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.resolveTime')">
          {{ event.resolveTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.responseDueTime')">
          {{ event.responseDueTime ?? $t('mes.andon.noDeadline') }}
          <span v-if="event.responseOverdueTime" class="text-destructive ml-2">
            {{ $t('mes.andon.overdueAt', { time: event.responseOverdueTime }) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.resolveDueTime')">
          {{ event.resolveDueTime ?? $t('mes.andon.noDeadline') }}
          <span v-if="event.resolveOverdueTime" class="text-destructive ml-2">
            {{ $t('mes.andon.overdueAt', { time: event.resolveOverdueTime }) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.escalation')">
          {{
            $t('mes.andon.escalatedTimes', { count: event.escalateCount ?? 0 })
          }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.duration')">
          {{ formatMinutes(event.durationMinutes) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.downtimeMinutes')">
          {{ formatMinutes(event.downtimeMinutes) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.andon.resolveRemark')" :span="2">
          <span class="whitespace-pre-wrap break-all">
            {{ event.resolveRemark }}
          </span>
        </DescriptionsItem>
      </Descriptions>

      <h3 class="mb-2 mt-6 font-medium">{{ $t('mes.andon.logs') }}</h3>
      <Empty
        v-if="logs.length === 0"
        :description="$t('mes.andon.noLogs')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <Timeline v-else class="pt-2">
        <TimelineItem v-for="log in logs" :key="log.logId">
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
        </TimelineItem>
      </Timeline>
    </template>
  </Drawer>
</template>
