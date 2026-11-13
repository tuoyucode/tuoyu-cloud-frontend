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
import { Card, Table } from 'ant-design-vue';

import { $t } from '#/locales';

import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import { chartColors, comboOption } from '../_shared/charts';
import { labelOf, useAnalysis } from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisDowntime' });

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Downtime>('downtime', getDowntimeAnalysis, 'reason');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);

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
    dataIndex: 'label',
    key: 'label',
    title: $t(`mes.analysis.dimension.${data.value?.dimension ?? 'reason'}`),
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
    dataIndex: key,
    key,
    title: $t(`mes.analysis.downtime.${key}`),
  })),
  {
    align: 'right' as const,
    dataIndex: 'ratio',
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

      <Card :title="$t('mes.analysis.downtime.chart')" size="small">
        <AnalysisChart :empty="empty" :option="chartOption" />
      </Card>

      <Card :title="$t('mes.analysis.downtime.detail')" size="small">
        <Table
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :locale="{ emptyText: $t('mes.analysis.common.empty') }"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :row-key="rowKey"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'label'">
              {{ labelOfRow(record as AnalysisApi.DowntimeRow) }}
            </template>
            <template v-else-if="column.key === 'openCount'">
              <span :class="record.openCount > 0 ? 'text-destructive' : ''">
                {{ record.openCount }}
              </span>
            </template>
            <template
              v-else-if="
                ['avgDowntimeMinutes', 'downtimeMinutes'].includes(
                  String(column.key),
                )
              "
            >
              {{ formatQty(record[String(column.key)]) }}
            </template>
            <template v-else-if="column.key === 'ratio'">
              {{ formatRate(record.ratio) }}
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>
