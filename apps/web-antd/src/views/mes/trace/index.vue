<script lang="ts" setup>
import type { TraceApi } from '@tuoyu/shared/api/mes/trace';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { traceByKeyword } from '@tuoyu/shared/api/mes/trace';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  Alert,
  Card,
  Empty,
  InputSearch,
  Spin,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import { $t } from '#/locales';

import { enumLabel } from '../_shared/enums';
import { eventColor, eventText } from './data';
import TraceWorkorder from './trace-workorder.vue';

defineOptions({ name: 'MesTrace' });

const keyword = ref('');
const loading = ref(false);
const result = ref<TraceApi.Result>();

const canQuery = computed(() => hasPermission('mes:trace:query'));

const matchLabel = computed(() =>
  result.value?.matchType
    ? $t(`mes.trace.matchTypes.${result.value.matchType}`)
    : '',
);

async function onSearch() {
  const value = keyword.value.trim();
  if (!value) {
    return;
  }
  loading.value = true;
  try {
    result.value = await traceByKeyword(value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Page :title="$t('mes.trace.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.trace.description') }}
      </span>
    </template>

    <div class="flex flex-col gap-4">
      <Card size="small">
        <InputSearch
          v-model:value="keyword"
          :disabled="!canQuery"
          :enter-button="$t('mes.trace.search')"
          :loading="loading"
          :maxlength="128"
          :placeholder="$t('mes.trace.keywordPlaceholder')"
          allow-clear
          size="large"
          @search="onSearch"
        />
      </Card>

      <Spin :spinning="loading">
        <template v-if="result">
          <Empty
            v-if="!result.matchType"
            :description="$t('mes.trace.notFound', { keyword: result.keyword })"
          />
          <div v-else class="flex flex-col gap-4">
            <Alert
              :message="
                $t('mes.trace.matched', {
                  count: result.workorders.length,
                  keyword: result.keyword,
                  type: matchLabel,
                })
              "
              show-icon
              type="info"
            />
            <Alert
              v-if="result.truncated"
              :message="
                $t('mes.trace.truncated', { count: result.workorders.length })
              "
              show-icon
              type="warning"
            />
            <div class="flex flex-col gap-4 xl:flex-row">
              <div class="flex min-w-0 flex-1 flex-col gap-4">
                <TraceWorkorder
                  v-for="workorder in result.workorders"
                  :key="workorder.workorderId"
                  :workorder="workorder"
                />
              </div>
              <Card
                :title="$t('mes.trace.timeline')"
                class="xl:w-[380px] xl:shrink-0"
                size="small"
              >
                <Empty
                  v-if="result.timeline.length === 0"
                  :description="$t('mes.trace.noEvents')"
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                />
                <Timeline v-else class="pt-2">
                  <TimelineItem
                    v-for="(event, index) in result.timeline"
                    :key="index"
                    :color="eventColor(event)"
                  >
                    <div class="text-muted-foreground text-xs">
                      {{ event.time }}
                      <template v-if="result.workorders.length > 1">
                        · {{ event.workorderCode }}
                      </template>
                    </div>
                    <div>
                      <span class="font-medium">
                        {{ enumLabel('BizType', event.category) }}
                      </span>
                      <span class="ml-2">{{ eventText(event) }}</span>
                    </div>
                    <div
                      v-if="event.operatorName"
                      class="text-muted-foreground text-xs"
                    >
                      {{ event.operatorName }}
                    </div>
                  </TimelineItem>
                </Timeline>
              </Card>
            </div>
          </div>
        </template>
        <Empty
          v-else
          :description="$t('mes.trace.hint')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </Spin>
    </div>
  </Page>
</template>
