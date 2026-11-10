<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';

import type { SummaryItem } from '../_shared/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getWorkhourAnalysis } from '@tuoyu/shared/api/mes/analysis';
import { Card, Table } from 'ant-design-vue';

import { $t } from '#/locales';

import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import {
  CHART_TOP,
  formatQty,
  topRows,
  toSeries,
} from '../_shared/analysis-utils';
import { chartColors, horizontalBarOption } from '../_shared/charts';
import { labelOf, useAnalysis } from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisWorkhour' });

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Workhour>('workhour', getWorkhourAnalysis, 'user');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);

function labelOfRow(row: AnalysisApi.WorkhourRow) {
  return labelOf(row, data.value?.dimension);
}

const summary = computed<SummaryItem[]>(() => {
  const vo = data.value;
  return [
    {
      key: 'reportCount',
      label: $t('mes.analysis.workhour.reportCount'),
      value: vo ? String(vo.reportCount) : '-',
    },
    {
      key: 'workHours',
      label: $t('mes.analysis.workhour.workHours'),
      value: formatQty(vo?.workHours),
    },
    {
      key: 'missingCount',
      label: $t('mes.analysis.workhour.missingCount'),
      value: vo ? String(vo.missingCount) : '-',
      warn: (vo?.missingCount ?? 0) > 0,
    },
  ];
});

/** 工时最多的前若干项：横向柱状 */
const chartOption = computed(() => {
  const colors = chartColors(isDark.value);
  const top = topRows(rows.value, (row) => row.workHours, CHART_TOP);
  const { categories, series } = toSeries(top, labelOfRow, {
    hours: (row) => row.workHours,
  });
  return horizontalBarOption({
    bars: [
      {
        color: colors.primary,
        data: series.hours ?? [],
        name: $t('mes.analysis.workhour.workHours'),
      },
    ],
    categories,
    colors,
  });
});

const chartHeight = computed(
  () => `${Math.max(240, Math.min(rows.value.length, CHART_TOP) * 28 + 60)}px`,
);

const columns = computed(() => [
  {
    dataIndex: 'label',
    key: 'label',
    title: $t(`mes.analysis.dimension.${data.value?.dimension ?? 'user'}`),
  },
  ...(
    [
      'reportCount',
      'reportQty',
      'qualifiedQty',
      'recordedMinutes',
      'derivedMinutes',
      'workHours',
      'minutesPerUnit',
      'missingCount',
    ] as const
  ).map((key) => ({
    align: 'right' as const,
    dataIndex: key,
    key,
    title: $t(`mes.analysis.workhour.${key}`),
  })),
]);

function rowKey(row: AnalysisApi.WorkhourRow) {
  return `${row.key ?? ''}|${row.label}`;
}

onMounted(load);
</script>

<template>
  <Page :title="$t('mes.analysis.workhour.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.analysis.workhour.description') }}
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
        :dimensions="['user', 'team', 'operation']"
        :exporting="exporting"
        :loading="loading"
        @export="exportRows"
        @reset="reset"
        @search="load"
      />

      <AnalysisSummary
        :caliber="$t('mes.analysis.workhour.caliber')"
        :failed="failed"
        :items="summary"
        @retry="load"
      />

      <Card
        :title="$t('mes.analysis.workhour.chart', { n: CHART_TOP })"
        size="small"
      >
        <AnalysisChart
          :empty="rows.length === 0"
          :height="chartHeight"
          :option="chartOption"
        />
      </Card>

      <Card :title="$t('mes.analysis.workhour.detail')" size="small">
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
              {{ labelOfRow(record as AnalysisApi.WorkhourRow) }}
            </template>
            <template v-else-if="column.key === 'missingCount'">
              <span :class="record.missingCount > 0 ? 'text-warning' : ''">
                {{ record.missingCount }}
              </span>
            </template>
            <template v-else-if="column.key !== 'reportCount'">
              {{ formatQty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>
