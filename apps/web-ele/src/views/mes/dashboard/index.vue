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
import {
  ElButton,
  ElCard,
  ElOption,
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

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

const CARD_BODY_STYLE = { padding: '12px 16px' };

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
  { align: undefined, key: 'date', title: $t('mes.dashboard.date') },
  {
    align: 'right' as const,
    key: 'qualifiedQty',
    title: $t('mes.dashboard.qualifiedQty'),
  },
  {
    align: 'right' as const,
    key: 'defectQty',
    title: $t('mes.dashboard.defectQty'),
  },
  {
    align: 'right' as const,
    key: 'yieldRate',
    title: $t('mes.dashboard.yieldRate'),
  },
]);

const defectColumns = computed(() => [
  {
    align: undefined,
    key: 'operationName',
    title: $t('mes.dashboard.operation'),
  },
  {
    align: 'right' as const,
    key: 'defectQty',
    title: $t('mes.dashboard.defectQty'),
  },
]);

const andonColumns = computed(() => [
  {
    align: undefined,
    key: 'eventType',
    title: $t('mes.dashboard.andonType'),
  },
  {
    align: 'right' as const,
    key: 'count',
    title: $t('mes.dashboard.andonCount'),
  },
  {
    align: 'right' as const,
    key: 'avgDowntimeMinutes',
    title: $t('mes.dashboard.avgDowntime'),
  },
]);

const openAndonColumns = computed(() => [
  { key: 'eventCode', title: $t('mes.dashboard.andonCode'), width: 150 },
  { key: 'eventLevel', title: $t('mes.dashboard.andonLevel'), width: 90 },
  {
    key: 'escalateCount',
    title: $t('mes.dashboard.andonEscalation'),
    width: 110,
  },
  { key: 'title', title: $t('mes.dashboard.andonTitle'), width: 180 },
  {
    key: 'workshopName',
    title: $t('mes.dashboard.andonLocation'),
    width: 200,
  },
  { key: 'eventStatus', title: $t('mes.dashboard.andonStatus'), width: 100 },
  {
    key: 'reportTime',
    title: $t('mes.dashboard.andonReportTime'),
    width: 170,
  },
]);

const progressColumns = computed(() => [
  {
    align: undefined,
    key: 'workorderCode',
    title: $t('mes.dashboard.workorderCode'),
    width: 160,
  },
  {
    align: undefined,
    key: 'materialName',
    title: $t('mes.dashboard.product'),
    width: 200,
  },
  {
    align: 'right' as const,
    key: 'planQty',
    title: $t('mes.dashboard.planQty'),
    width: 100,
  },
  {
    align: 'right' as const,
    key: 'completedQty',
    title: $t('mes.dashboard.completedQty'),
    width: 100,
  },
  {
    align: undefined,
    key: 'completionRate',
    title: $t('mes.dashboard.completionRate'),
    width: 200,
  },
  {
    align: undefined,
    key: 'planEndTime',
    title: $t('mes.dashboard.planEndTime'),
    width: 220,
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
      <div class="flex flex-wrap items-center gap-2">
        <ElSelect
          v-model="workshopId"
          :placeholder="$t('mes.dashboard.allWorkshops')"
          class="w-48!"
          clearable
        >
          <ElOption
            v-for="option in workshopOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
        <ElSelect v-model="days" class="w-32!">
          <ElOption
            v-for="option in dayOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
        <ElButton :loading="loading" @click="load">
          {{ $t('mes.dashboard.refresh') }}
        </ElButton>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <!-- 汇总卡片 -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <ElCard
          v-for="card in cards"
          :key="card.key"
          :body-style="CARD_BODY_STYLE"
          shadow="never"
        >
          <div class="text-muted-foreground truncate text-sm">
            {{ card.label }}
          </div>
          <div
            :class="card.warn ? 'text-destructive' : ''"
            class="mt-1 text-2xl font-semibold tabular-nums"
          >
            {{ card.value }}
          </div>
        </ElCard>
      </div>

      <!-- 每日趋势 -->
      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">{{ $t('mes.dashboard.trend') }}</span>
        </template>
        <div class="flex flex-col gap-4 lg:flex-row">
          <EchartsUI ref="trendRef" class="min-w-0 flex-1" height="300px" />
          <div class="min-w-0 lg:w-[360px]">
            <ElTable
              :data="trendRows"
              max-height="300"
              row-key="date"
              size="small"
            >
              <ElTableColumn
                v-for="column in trendColumns"
                :key="column.key"
                :align="column.align"
                :label="column.title"
                min-width="80"
              >
                <template #default="{ row }">
                  <template v-if="column.key === 'yieldRate'">
                    {{ percent(row.yieldRate) }}
                  </template>
                  <template
                    v-else-if="
                      ['defectQty', 'qualifiedQty'].includes(column.key)
                    "
                  >
                    <span class="tabular-nums">{{ qty(row[column.key]) }}</span>
                  </template>
                  <template v-else>{{ row[column.key] }}</template>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </div>
      </ElCard>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <!-- 不良排行 -->
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <template #header>
            <span class="font-medium">{{ $t('mes.dashboard.defectTop') }}</span>
          </template>
          <div class="flex flex-col gap-4 md:flex-row">
            <EchartsUI ref="defectRef" class="min-w-0 flex-1" height="240px" />
            <div class="min-w-0 md:w-[240px]">
              <ElTable
                :data="overview?.defectTop ?? []"
                :empty-text="$t('mes.dashboard.noDefects')"
                row-key="operationName"
                size="small"
              >
                <ElTableColumn
                  v-for="column in defectColumns"
                  :key="column.key"
                  :align="column.align"
                  :label="column.title"
                  min-width="80"
                >
                  <template #default="{ row }">
                    <template v-if="column.key === 'defectQty'">
                      <span class="tabular-nums">
                        {{ qty(row.defectQty) }}
                      </span>
                    </template>
                    <template v-else>{{ row[column.key] }}</template>
                  </template>
                </ElTableColumn>
              </ElTable>
            </div>
          </div>
        </ElCard>

        <!-- 安灯统计 -->
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <template #header>
            <span class="font-medium">
              {{ $t('mes.dashboard.andonByType') }}
            </span>
          </template>
          <div class="flex flex-col gap-4 md:flex-row">
            <EchartsUI ref="andonRef" class="min-w-0 flex-1" height="240px" />
            <div class="min-w-0 md:w-[280px]">
              <ElTable
                :data="overview?.andonByType ?? []"
                row-key="eventType"
                size="small"
              >
                <ElTableColumn
                  v-for="column in andonColumns"
                  :key="column.key"
                  :align="column.align"
                  :label="column.title"
                  min-width="80"
                >
                  <template #default="{ row }">
                    <template v-if="column.key === 'eventType'">
                      {{ enumLabel('AndonType', row.eventType) }}
                    </template>
                    <template v-else-if="column.key === 'avgDowntimeMinutes'">
                      {{
                        row.avgDowntimeMinutes === null ||
                        row.avgDowntimeMinutes === undefined
                          ? '-'
                          : $t('mes.dashboard.minutes', {
                              m: Number(row.avgDowntimeMinutes),
                            })
                      }}
                    </template>
                    <template v-else>{{ row[column.key] }}</template>
                  </template>
                </ElTableColumn>
              </ElTable>
            </div>
          </div>
        </ElCard>
      </div>

      <!-- 未解决的安灯 -->
      <ElCard v-if="canListAndon" :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.dashboard.openAndonList') }}
          </span>
        </template>
        <ElTable
          :data="openAndons"
          :empty-text="$t('mes.dashboard.noOpenAndons')"
          row-key="eventId"
          size="small"
        >
          <ElTableColumn
            v-for="column in openAndonColumns"
            :key="column.key"
            :label="column.title"
            :min-width="column.width"
          >
            <template #default="{ row }">
              <template v-if="column.key === 'eventCode'">
                <span class="font-mono">{{ row.eventCode }}</span>
              </template>
              <template v-else-if="column.key === 'eventLevel'">
                <EnumTag :value="row.eventLevel" type="AndonLevel" />
              </template>
              <template v-else-if="column.key === 'escalateCount'">
                <ElTag v-if="(row.escalateCount ?? 0) > 0" type="danger">
                  {{
                    $t('mes.dashboard.escalatedTimes', {
                      count: row.escalateCount,
                    })
                  }}
                </ElTag>
                <span v-else class="text-muted-foreground">-</span>
              </template>
              <template v-else-if="column.key === 'workshopName'">
                {{
                  [row.workshopName, row.lineName, row.stationName]
                    .filter(Boolean)
                    .join(' / ')
                }}
              </template>
              <template v-else-if="column.key === 'eventStatus'">
                <EnumTag :value="row.eventStatus" type="AndonStatus" />
              </template>
              <template v-else>{{ row[column.key] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <!-- 工单进度 -->
      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.dashboard.workorderProgress') }}
          </span>
        </template>
        <ElTable
          :data="overview?.workorderProgress ?? []"
          :empty-text="$t('mes.dashboard.noWorkorders')"
          row-key="workorderId"
          size="small"
        >
          <ElTableColumn
            v-for="column in progressColumns"
            :key="column.key"
            :align="column.align"
            :label="column.title"
            :min-width="column.width"
          >
            <template #default="{ row }">
              <template v-if="column.key === 'workorderCode'">
                <span class="font-mono">{{ row.workorderCode }}</span>
              </template>
              <template v-else-if="column.key === 'materialName'">
                {{ row.materialCode }} {{ row.materialName }}
              </template>
              <template
                v-else-if="['completedQty', 'planQty'].includes(column.key)"
              >
                <span class="tabular-nums">{{ qty(row[column.key]) }}</span>
              </template>
              <template v-else-if="column.key === 'completionRate'">
                <ElProgress
                  :percentage="Math.min(100, Number(row.completionRate ?? 0))"
                  :status="row.overdue ? 'exception' : undefined"
                  :stroke-width="6"
                />
              </template>
              <template v-else-if="column.key === 'planEndTime'">
                {{ row.planEndTime ?? '-' }}
                <ElTag v-if="row.overdue" class="ml-2" type="danger">
                  {{ $t('mes.dashboard.overdue') }}
                </ElTag>
              </template>
              <template v-else>{{ row[column.key] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
  </Page>
</template>
