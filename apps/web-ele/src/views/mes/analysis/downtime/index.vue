<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getDowntimeAnalysis } from '@tuoyu/shared/api/mes/analysis';
import {
  formatQty,
  formatRate,
  toSeries,
} from '@tuoyu/shared/pages/mes/analysis-utils';
import { ElCard, ElPagination, ElTable, ElTableColumn } from 'element-plus';

import { $t } from '#/locales';

import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import { chartColors, comboOption } from '../_shared/charts';
import {
  labelOf,
  TABLE_PAGE_SIZES,
  useAnalysis,
  useTablePager,
} from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisDowntime' });

const CARD_BODY_STYLE = { padding: '12px 16px' };

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Downtime>('downtime', getDowntimeAnalysis, 'reason');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);
const { page, pagedRows, pageSize, total } = useTablePager(rows);

const empty = computed(() => (data.value?.eventCount ?? 0) === 0);

function labelOfRow(row: AnalysisApi.DowntimeRow) {
  return labelOf(row, data.value?.dimension);
}

const summary = computed<SummaryItem[]>(() => {
  const vo = data.value;
  return [
    {
      key: 'eventCount',
      label: $t('mes.analysis.downtime.eventCount'),
      value: vo ? String(vo.eventCount) : '-',
    },
    {
      key: 'openCount',
      label: $t('mes.analysis.downtime.openCount'),
      value: vo ? String(vo.openCount) : '-',
      warn: (vo?.openCount ?? 0) > 0,
    },
    {
      key: 'downtimeMinutes',
      label: $t('mes.analysis.downtime.downtimeMinutes'),
      value: formatQty(vo?.downtimeMinutes),
    },
    {
      key: 'avgDowntimeMinutes',
      label: $t('mes.analysis.downtime.avgDowntimeMinutes'),
      value: formatQty(vo?.avgDowntimeMinutes),
    },
  ];
});

/** 停机时长柱状，停机次数折线（右轴） */
const chartOption = computed(() => {
  const colors = chartColors(isDark.value);
  const { categories, series } = toSeries(rows.value, labelOfRow, {
    count: (row) => row.eventCount,
    minutes: (row) => row.downtimeMinutes,
  });
  return comboOption({
    bars: [
      {
        color: colors.warning,
        data: series.minutes ?? [],
        name: $t('mes.analysis.downtime.downtimeMinutes'),
      },
    ],
    categories,
    colors,
    lines: [
      {
        color: colors.primary,
        data: series.count ?? [],
        name: $t('mes.analysis.downtime.eventCount'),
      },
    ],
    rightAxis: 'value',
  });
});

const columns = computed(() => [
  {
    key: 'label',
    title: $t(`mes.analysis.dimension.${data.value?.dimension ?? 'reason'}`),
    width: 160,
  },
  ...(
    [
      'eventCount',
      'openCount',
      'downtimeMinutes',
      'avgDowntimeMinutes',
    ] as const
  ).map((key) => ({
    align: 'right' as const,
    key,
    title: $t(`mes.analysis.downtime.${key}`),
  })),
  {
    align: 'right' as const,
    key: 'ratio',
    title: $t('mes.analysis.downtime.ratio'),
  },
]);

function rowKey(row: AnalysisApi.DowntimeRow) {
  return row.key ?? '';
}

onMounted(load);
</script>

<template>
  <Page :title="$t('mes.analysis.downtime.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.analysis.downtime.description') }}
        <template v-if="data">
          ·
          {{
            $t('mes.analysis.common.generatedAt', { time: data.generatedAt })
          }}
        </template>
      </span>
    </template>

    <div class="flex flex-col gap-4">
      <AnalysisFilter
        v-model="filters"
        :dimensions="['reason', 'line', 'date']"
        :exporting="exporting"
        :loading="loading"
        granularity
        @export="exportRows"
        @reset="reset"
        @search="load"
      />

      <AnalysisSummary
        :caliber="$t('mes.analysis.downtime.caliber')"
        :failed="failed"
        :items="summary"
        @retry="load"
      />

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.analysis.downtime.chart') }}
          </span>
        </template>
        <AnalysisChart :empty="empty" :option="chartOption" />
      </ElCard>

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.analysis.downtime.detail') }}
          </span>
        </template>
        <ElTable
          v-loading="loading"
          :data="pagedRows"
          :empty-text="$t('mes.analysis.common.empty')"
          :row-key="rowKey"
          size="small"
        >
          <ElTableColumn
            v-for="column in columns"
            :key="column.key"
            :align="column.align"
            :label="column.title"
            :min-width="column.width ?? 110"
          >
            <template #default="{ row }">
              <template v-if="column.key === 'label'">
                {{ labelOfRow(row as AnalysisApi.DowntimeRow) }}
              </template>
              <template v-else-if="column.key === 'openCount'">
                <span :class="row.openCount > 0 ? 'text-destructive' : ''">
                  {{ row.openCount }}
                </span>
              </template>
              <template
                v-else-if="
                  ['avgDowntimeMinutes', 'downtimeMinutes'].includes(column.key)
                "
              >
                {{ formatQty(row[column.key]) }}
              </template>
              <template v-else-if="column.key === 'ratio'">
                {{ formatRate(row.ratio) }}
              </template>
              <template v-else>{{ row[column.key] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="TABLE_PAGE_SIZES"
          :total="total"
          class="mt-3 flex-wrap justify-end gap-y-2"
          layout="total, sizes, prev, pager, next"
          size="small"
        />
      </ElCard>
    </div>
  </Page>
</template>
