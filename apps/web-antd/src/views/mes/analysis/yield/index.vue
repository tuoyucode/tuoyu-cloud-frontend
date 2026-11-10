<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';

import type { SummaryItem } from '../_shared/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getYieldAnalysis } from '@tuoyu/shared/api/mes/analysis';
import { Card, Table } from 'ant-design-vue';

import { $t } from '#/locales';

import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import { formatQty, formatRate, toSeries } from '../_shared/analysis-utils';
import { chartColors, comboOption } from '../_shared/charts';
import { labelOf, useAnalysis } from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisYield' });

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Yield>('yield', getYieldAnalysis, 'date');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);

const empty = computed(() =>
  rows.value.every((row) => Number(row.reportQty ?? 0) === 0),
);

function labelOfRow(row: AnalysisApi.YieldRow) {
  return labelOf(row, data.value?.dimension);
}

const summary = computed<SummaryItem[]>(() => {
  const vo = data.value;
  return [
    {
      key: 'reportQty',
      label: $t('mes.analysis.yield.reportQty'),
      value: formatQty(vo?.reportQty),
    },
    {
      key: 'qualifiedQty',
      label: $t('mes.analysis.yield.qualifiedQty'),
      value: formatQty(vo?.qualifiedQty),
    },
    {
      key: 'defectQty',
      label: $t('mes.analysis.yield.defectQty'),
      value: formatQty(vo?.defectQty),
    },
    {
      key: 'yieldRate',
      label: $t('mes.analysis.yield.yieldRate'),
      value: formatRate(vo?.yieldRate),
    },
    {
      key: 'firstPassYield',
      label: $t('mes.analysis.yield.firstPassYield'),
      value: formatRate(vo?.firstPassYield),
    },
  ];
});

/** 合格数与不良数堆叠，良率与直通率画在右侧的百分数轴 */
const chartOption = computed(() => {
  const colors = chartColors(isDark.value);
  const { categories, series } = toSeries(rows.value, labelOfRow, {
    defect: (row) => row.defectQty,
    firstPass: (row) => row.firstPassYield,
    qualified: (row) => row.qualifiedQty,
    yield: (row) => row.yieldRate,
  });
  return comboOption({
    bars: [
      {
        color: colors.primary,
        data: series.qualified ?? [],
        name: $t('mes.analysis.yield.qualifiedQty'),
        stack: 'qty',
      },
      {
        color: colors.danger,
        data: series.defect ?? [],
        name: $t('mes.analysis.yield.defectQty'),
        stack: 'qty',
      },
    ],
    categories,
    colors,
    lines: [
      {
        color: colors.success,
        data: series.yield ?? [],
        name: $t('mes.analysis.yield.yieldRate'),
      },
      {
        color: colors.warning,
        data: series.firstPass ?? [],
        name: $t('mes.analysis.yield.firstPassYield'),
      },
    ],
    rightAxis: 'percent',
  });
});

const columns = computed(() => [
  {
    dataIndex: 'label',
    key: 'label',
    title: $t(`mes.analysis.dimension.${data.value?.dimension ?? 'date'}`),
  },
  ...(['reportQty', 'qualifiedQty', 'defectQty'] as const).map((key) => ({
    align: 'right' as const,
    dataIndex: key,
    key,
    title: $t(`mes.analysis.yield.${key}`),
  })),
  ...(['yieldRate', 'firstPassYield'] as const).map((key) => ({
    align: 'right' as const,
    dataIndex: key,
    key,
    title: $t(`mes.analysis.yield.${key}`),
  })),
  {
    align: 'right' as const,
    dataIndex: 'workorderCount',
    key: 'workorderCount',
    title: $t('mes.analysis.yield.workorderCount'),
  },
]);

function rowKey(row: AnalysisApi.YieldRow) {
  return row.key ?? '';
}

onMounted(load);
</script>

<template>
  <Page :title="$t('mes.analysis.yield.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.analysis.yield.description') }}
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
        :dimensions="['date', 'product', 'line']"
        :exporting="exporting"
        :loading="loading"
        granularity
        @export="exportRows"
        @reset="reset"
        @search="load"
      />

      <AnalysisSummary
        :caliber="$t('mes.analysis.yield.caliber')"
        :failed="failed"
        :items="summary"
        @retry="load"
      />

      <Card :title="$t('mes.analysis.yield.chart')" size="small">
        <AnalysisChart :empty="empty" :option="chartOption" />
      </Card>

      <Card :title="$t('mes.analysis.yield.detail')" size="small">
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
              {{ labelOfRow(record as AnalysisApi.YieldRow) }}
            </template>
            <template
              v-else-if="
                ['defectQty', 'qualifiedQty', 'reportQty'].includes(
                  String(column.key),
                )
              "
            >
              {{ formatQty(record[String(column.key)]) }}
            </template>
            <template
              v-else-if="
                ['firstPassYield', 'yieldRate'].includes(String(column.key))
              "
            >
              {{ formatRate(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>
