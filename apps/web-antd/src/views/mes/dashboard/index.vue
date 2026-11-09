<script lang="ts" setup>
import type { DashboardApi } from '@tuoyu/shared/api/mes/dashboard';

import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { getDashboardOverview } from '@tuoyu/shared/api/mes/dashboard';
import { Button, Card, Progress, Select, Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import { enumLabel } from '../_shared/enums';
import {
  andonOption,
  DAY_OPTIONS,
  defectOption,
  percent,
  qty,
  trendOption,
} from './data';

defineOptions({ name: 'MesDashboard' });

const loading = ref(false);
const overview = ref<DashboardApi.Overview>();
const workshopId = ref<string>();
const days = ref<number>(7);
const workshopOptions = ref<{ label: string; value: string }[]>([]);

const trendRef = ref<EchartsUIType>();
const defectRef = ref<EchartsUIType>();
const andonRef = ref<EchartsUIType>();
const { renderEcharts: renderTrend } = useEcharts(trendRef);
const { renderEcharts: renderDefect } = useEcharts(defectRef);
const { renderEcharts: renderAndon } = useEcharts(andonRef);
const { isDark } = usePreferences();

const dayOptions = computed(() =>
  DAY_OPTIONS.map((value) => ({
    label: $t('mes.dashboard.recentDays', { days: value }),
    value,
  })),
);

/** 汇总卡片 */
const cards = computed(() => {
  const summary = overview.value?.summary;
  return [
    {
      key: 'activeWorkorders',
      label: $t('mes.dashboard.activeWorkorders'),
      value: summary ? String(summary.activeWorkorders) : '-',
    },
    {
      key: 'todayQualifiedQty',
      label: $t('mes.dashboard.todayQualifiedQty'),
      value: qty(summary?.todayQualifiedQty),
    },
    {
      key: 'todayDefectQty',
      label: $t('mes.dashboard.todayDefectQty'),
      value: qty(summary?.todayDefectQty),
    },
    {
      key: 'todayYieldRate',
      label: $t('mes.dashboard.todayYieldRate'),
      value: percent(summary?.todayYieldRate),
    },
    {
      key: 'openAndons',
      label: $t('mes.dashboard.openAndons'),
      value: summary ? String(summary.openAndons) : '-',
      warn: (summary?.openAndons ?? 0) > 0,
    },
    {
      key: 'pendingDefects',
      label: $t('mes.dashboard.pendingDefects'),
      value: summary ? String(summary.pendingDefects) : '-',
      warn: (summary?.pendingDefects ?? 0) > 0,
    },
  ];
});

/** 趋势表格按日期倒序，最近的在上面 */
const trendRows = computed(() => (overview.value?.trend ?? []).toReversed());

const trendColumns = computed(() => [
  { dataIndex: 'date', key: 'date', title: $t('mes.dashboard.date') },
  {
    align: 'right' as const,
    dataIndex: 'qualifiedQty',
    key: 'qualifiedQty',
    title: $t('mes.dashboard.qualifiedQty'),
  },
  {
    align: 'right' as const,
    dataIndex: 'defectQty',
    key: 'defectQty',
    title: $t('mes.dashboard.defectQty'),
  },
  {
    align: 'right' as const,
    dataIndex: 'yieldRate',
    key: 'yieldRate',
    title: $t('mes.dashboard.yieldRate'),
  },
]);

const defectColumns = computed(() => [
  {
    dataIndex: 'operationName',
    key: 'operationName',
    title: $t('mes.dashboard.operation'),
  },
  {
    align: 'right' as const,
    dataIndex: 'defectQty',
    key: 'defectQty',
    title: $t('mes.dashboard.defectQty'),
  },
]);

const andonColumns = computed(() => [
  {
    dataIndex: 'eventType',
    key: 'eventType',
    title: $t('mes.dashboard.andonType'),
  },
  {
    align: 'right' as const,
    dataIndex: 'count',
    key: 'count',
    title: $t('mes.dashboard.andonCount'),
  },
  {
    align: 'right' as const,
    dataIndex: 'avgDowntimeMinutes',
    key: 'avgDowntimeMinutes',
    title: $t('mes.dashboard.avgDowntime'),
  },
]);

const progressColumns = computed(() => [
  {
    dataIndex: 'workorderCode',
    key: 'workorderCode',
    title: $t('mes.dashboard.workorderCode'),
  },
  {
    dataIndex: 'materialName',
    key: 'materialName',
    title: $t('mes.dashboard.product'),
  },
  {
    align: 'right' as const,
    dataIndex: 'planQty',
    key: 'planQty',
    title: $t('mes.dashboard.planQty'),
  },
  {
    align: 'right' as const,
    dataIndex: 'completedQty',
    key: 'completedQty',
    title: $t('mes.dashboard.completedQty'),
  },
  {
    dataIndex: 'completionRate',
    key: 'completionRate',
    title: $t('mes.dashboard.completionRate'),
    width: 200,
  },
  {
    dataIndex: 'planEndTime',
    key: 'planEndTime',
    title: $t('mes.dashboard.planEndTime'),
  },
]);

function renderCharts() {
  const data = overview.value;
  if (!data) {
    return;
  }
  renderTrend(trendOption(data.trend));
  renderDefect(defectOption(data.defectTop));
  renderAndon(andonOption(data.andonByType));
}

async function load() {
  loading.value = true;
  try {
    overview.value = await getDashboardOverview({
      days: days.value,
      workshopId: workshopId.value,
    });
    await nextTick();
    renderCharts();
  } finally {
    loading.value = false;
  }
}

async function loadWorkshops() {
  workshopOptions.value = toSelectOptions(await getMesOptions('workshop'));
}

// 切换明暗模式后，主题色等变量随之变化，重新绘制
watch(isDark, async () => {
  await nextTick();
  renderCharts();
});

watch([workshopId, days], load);

onMounted(() => {
  loadWorkshops();
  load();
});
</script>

<template>
  <Page :title="$t('mes.dashboard.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.dashboard.description') }}
        <template v-if="overview">
          ·
          {{ $t('mes.dashboard.generatedAt', { time: overview.generatedAt }) }}
        </template>
      </span>
    </template>
    <template #extra>
      <div class="flex flex-wrap gap-2">
        <Select
          v-model:value="workshopId"
          :options="workshopOptions"
          :placeholder="$t('mes.dashboard.allWorkshops')"
          allow-clear
          class="w-48"
        />
        <Select v-model:value="days" :options="dayOptions" class="w-32" />
        <Button :loading="loading" @click="load">
          {{ $t('mes.dashboard.refresh') }}
        </Button>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <!-- 汇总卡片 -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card v-for="card in cards" :key="card.key" size="small">
          <div class="text-muted-foreground text-sm">{{ card.label }}</div>
          <div
            :class="card.warn ? 'text-destructive' : ''"
            class="mt-1 text-2xl font-semibold tabular-nums"
          >
            {{ card.value }}
          </div>
        </Card>
      </div>

      <!-- 每日趋势 -->
      <Card :title="$t('mes.dashboard.trend')" size="small">
        <div class="flex flex-col gap-4 lg:flex-row">
          <EchartsUI ref="trendRef" class="min-w-0 flex-1" height="300px" />
          <Table
            :columns="trendColumns"
            :data-source="trendRows"
            :pagination="false"
            :scroll="{ y: 260 }"
            class="lg:w-[360px]"
            row-key="date"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'yieldRate'">
                {{ percent(record.yieldRate) }}
              </template>
              <template
                v-else-if="
                  ['defectQty', 'qualifiedQty'].includes(String(column.key))
                "
              >
                {{ qty(record[String(column.key)]) }}
              </template>
            </template>
          </Table>
        </div>
      </Card>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <!-- 不良排行 -->
        <Card :title="$t('mes.dashboard.defectTop')" size="small">
          <div class="flex flex-col gap-4 md:flex-row">
            <EchartsUI ref="defectRef" class="min-w-0 flex-1" height="240px" />
            <Table
              :columns="defectColumns"
              :data-source="overview?.defectTop ?? []"
              :locale="{ emptyText: $t('mes.dashboard.noDefects') }"
              :pagination="false"
              class="md:w-[240px]"
              row-key="operationName"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'defectQty'">
                  {{ qty(record.defectQty) }}
                </template>
              </template>
            </Table>
          </div>
        </Card>

        <!-- 安灯统计 -->
        <Card :title="$t('mes.dashboard.andonByType')" size="small">
          <div class="flex flex-col gap-4 md:flex-row">
            <EchartsUI ref="andonRef" class="min-w-0 flex-1" height="240px" />
            <Table
              :columns="andonColumns"
              :data-source="overview?.andonByType ?? []"
              :pagination="false"
              class="md:w-[280px]"
              row-key="eventType"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'eventType'">
                  {{ enumLabel('AndonType', record.eventType) }}
                </template>
                <template v-else-if="column.key === 'avgDowntimeMinutes'">
                  {{
                    record.avgDowntimeMinutes === null ||
                    record.avgDowntimeMinutes === undefined
                      ? '-'
                      : $t('mes.dashboard.minutes', {
                          m: Number(record.avgDowntimeMinutes),
                        })
                  }}
                </template>
              </template>
            </Table>
          </div>
        </Card>
      </div>

      <!-- 工单进度 -->
      <Card :title="$t('mes.dashboard.workorderProgress')" size="small">
        <Table
          :columns="progressColumns"
          :data-source="overview?.workorderProgress ?? []"
          :locale="{ emptyText: $t('mes.dashboard.noWorkorders') }"
          :pagination="false"
          row-key="workorderId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'workorderCode'">
              <span class="font-mono">{{ record.workorderCode }}</span>
            </template>
            <template v-else-if="column.key === 'materialName'">
              {{ record.materialCode }} {{ record.materialName }}
            </template>
            <template
              v-else-if="
                ['completedQty', 'planQty'].includes(String(column.key))
              "
            >
              {{ qty(record[String(column.key)]) }}
            </template>
            <template v-else-if="column.key === 'completionRate'">
              <Progress
                :percent="Math.min(100, Number(record.completionRate ?? 0))"
                :status="record.overdue ? 'exception' : 'normal'"
                size="small"
              />
            </template>
            <template v-else-if="column.key === 'planEndTime'">
              {{ record.planEndTime ?? '-' }}
              <Tag v-if="record.overdue" class="ml-2" color="error">
                {{ $t('mes.dashboard.overdue') }}
              </Tag>
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>
