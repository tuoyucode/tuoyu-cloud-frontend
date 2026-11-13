<script lang="ts" setup>
import type { TraceApi } from '@tuoyu/shared/api/mes/trace';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { traceByKeyword } from '@tuoyu/shared/api/mes/trace';
import { enumLabel } from '@tuoyu/shared/pages/mes/enums';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElAlert,
  ElButton,
  ElCard,
  ElEmpty,
  ElInput,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';

import { $t } from '#/locales';
import { tagType } from '#/views/mes/_shared/tag-type';

import { deniedSectionsText, eventColor, eventText } from './data';
import TraceWorkorder from './trace-workorder.vue';

defineOptions({ name: 'MesTrace' });

const keyword = ref('');
const loading = ref(false);
const result = ref<TraceApi.Result>();

const canQuery = computed(() => hasPermission('mes:trace:query'));

/** 没有权限、未显示的段 */
const deniedText = computed(() =>
  deniedSectionsText(result.value?.deniedSections),
);

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
      <ElCard :body-style="{ padding: '12px 16px' }" shadow="never">
        <ElInput
          v-model="keyword"
          :disabled="!canQuery"
          :maxlength="128"
          :placeholder="$t('mes.trace.keywordPlaceholder')"
          clearable
          size="large"
          @keyup.enter="onSearch"
        >
          <template #append>
            <ElButton
              :disabled="!canQuery"
              :loading="loading"
              type="primary"
              @click="onSearch"
            >
              {{ $t('mes.trace.search') }}
            </ElButton>
          </template>
        </ElInput>
      </ElCard>

      <div v-loading="loading">
        <template v-if="result">
          <ElEmpty
            v-if="!result.matchType"
            :description="$t('mes.trace.notFound', { keyword: result.keyword })"
          />
          <div v-else class="flex flex-col gap-4">
            <ElAlert
              :closable="false"
              :title="
                $t('mes.trace.matched', {
                  count: result.workorders.length,
                  keyword: result.keyword,
                  type: matchLabel,
                })
              "
              show-icon
              type="info"
            />
            <ElAlert
              v-if="deniedText"
              :closable="false"
              :title="$t('mes.trace.deniedSections', { sections: deniedText })"
              show-icon
              type="warning"
            />
            <ElAlert
              v-if="result.truncated"
              :closable="false"
              :title="
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
                  :denied-sections="result.deniedSections"
                  :workorder="workorder"
                />
              </div>
              <ElCard
                :body-style="{ padding: '12px 16px' }"
                class="xl:w-[380px] xl:shrink-0"
                shadow="never"
              >
                <template #header>
                  <span class="font-medium">
                    {{ $t('mes.trace.timeline') }}
                  </span>
                </template>
                <ElEmpty
                  v-if="result.timeline.length === 0"
                  :description="$t('mes.trace.noEvents')"
                  :image-size="60"
                />
                <ElTimeline v-else class="pt-2">
                  <ElTimelineItem
                    v-for="(event, index) in result.timeline"
                    :key="index"
                    :type="tagType(eventColor(event))"
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
                  </ElTimelineItem>
                </ElTimeline>
              </ElCard>
            </div>
          </div>
        </template>
        <ElEmpty v-else :description="$t('mes.trace.hint')" :image-size="60" />
      </div>
    </div>
  </Page>
</template>
