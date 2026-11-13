<script lang="ts" setup>
import type { AndonApi } from '@tuoyu/shared/api/mes/andon';
import type { DashboardApi } from '@tuoyu/shared/api/mes/dashboard';

import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { listAndon } from '@tuoyu/shared/api/mes/andon';
import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { getDashboardOverview } from '@tuoyu/shared/api/mes/dashboard';
import { enumLabel } from '@tuoyu/shared/pages/mes/enums';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, Card, Progress, Select, Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import { useAutoRefresh } from '../_shared/use-auto-refresh';
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

/** 未解决的安灯事件（升级次数多的在前）；没有安灯列表权限时不显示 */
const OPEN_ANDON_LIMIT = 10;
const canListAndon = hasPermission('mes:andon:list');
const openAndons = ref<AndonApi.Event[]>([]);

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

const openAndonColumns = computed(() => [
  {
    dataIndex: 'eventCode',
    key: 'eventCode',
    title: $t('mes.dashboard.andonCode'),
  },
  {
    dataIndex: 'eventLevel',
    key: 'eventLevel',
    title: $t('mes.dashboard.andonLevel'),
  },
  {
    dataIndex: 'escalateCount',
    key: 'escalateCount',
    title: $t('mes.dashboard.andonEscalation'),
  },
  { dataIndex: 'title', key: 'title', title: $t('mes.dashboard.andonTitle') },
  {
    dataIndex: 'workshopName',
    key: 'workshopName',
    title: $t('mes.dashboard.andonLocation'),
  },
  {
    dataIndex: 'eventStatus',
    key: 'eventStatus',
    title: $t('mes.dashboard.andonStatus'),
  },
  {
    dataIndex: 'reportTime',
    key: 'reportTime',
    title: $t('mes.dashboard.andonReportTime'),
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

async function loadOpenAndons() {
  if (!canListAndon) {
    return;
  }
  try {
    const page = await listAndon({
      open: true,
      page: 1,
      pageSize: OPEN_ANDON_LIMIT,
      sort: ['escalateCount,desc', 'reportTime,asc'],
      workshopId: workshopId.value,
    });
    openAndons.value = page.items;
  } catch {
    // 失败原因已由请求层提示，保留上一次的数据
  }
}

async function load() {
  loading.value = true;
  void loadOpenAndons();
  try {
    overview.value = await getDashboardOverview({
      days: days.value,
      workshopId: workshopId.value,
    });
    await nextTick();
    renderCharts();
  } catch {
    // 失败原因已由请求层提示，保留上一次的数据
  } finally {
    loading.value = false;
  }
}

async function loadWorkshops() {
  try {
    workshopOptions.value = toSelectOptions(await getMesOptions('workshop'));
  } catch {
    // 失败原因已由请求层提示，车间下拉为空时看板按全部车间统计
    workshopOptions.value = [];
  }
}

// 切换明暗模式后，主题色等变量随之变化，重新绘制
watch(isDark, async () => {
  await nextTick();
  renderCharts();
});

watch([workshopId, days], load);

// 看板每 30 秒自动刷新（页面不可见时暂停，离开页面时停止）
useAutoRefresh(load);

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
        · {{ $t('mes.dashboard.autoRefresh') }}
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

      <!-- 未解决的安灯 -->
      <Card
        v-if="canListAndon"
        :title="$t('mes.dashboard.openAndonList')"
        size="small"
      >
        <Table
          :columns="openAndonColumns"
          :data-source="openAndons"
          :locale="{ emptyText: $t('mes.dashboard.noOpenAndons') }"
          :pagination="false"
          row-key="eventId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'eventCode'">
              <span class="font-mono">{{ record.eventCode }}</span>
            </template>
            <template v-else-if="column.key === 'eventLevel'">
              <EnumTag :value="record.eventLevel" type="AndonLevel" />
            </template>
            <template v-else-if="column.key === 'escalateCount'">
              <Tag v-if="(record.escalateCount ?? 0) > 0" color="error">
                {{
                  $t('mes.dashboard.escalatedTimes', {
                    count: record.escalateCount,
                  })
                }}
              </Tag>
              <span v-else class="text-muted-foreground">-</span>
            </template>
            <template v-else-if="column.key === 'workshopName'">
              {{
                [record.workshopName, record.lineName, record.stationName]
                  .filter(Boolean)
                  .join(' / ')
              }}
            </template>
            <template v-else-if="column.key === 'eventStatus'">
              <EnumTag :value="record.eventStatus" type="AndonStatus" />
            </template>
          </template>
        </Table>
      </Card>

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
