<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getWipAnalysis } from '@tuoyu/shared/api/mes/analysis';
import { formatQty, toSeries } from '@tuoyu/shared/pages/mes/analysis-utils';
import { Card, Table } from 'ant-design-vue';

import { $t } from '#/locales';

import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import { chartColors, comboOption } from '../_shared/charts';
import { labelOf, useAnalysis } from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisWip' });

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Wip>('wip', getWipAnalysis, 'operation');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);

const byLine = computed(() => data.value?.dimension === 'line');

/** 统计项的名称：工序（按产线统计时前面加产线） */
function operationOf(row: AnalysisApi.WipRow) {
  const operation =
    row.operationName ?? labelOf({ key: null, label: '' }, 'operation');
  if (!byLine.value) {
    return operation;
  }
  const line =
    row.lineId === null || row.lineId === undefined
      ? labelOf({ key: null, label: '' }, 'line')
      : (row.lineName ?? '');
  return `${line} / ${operation}`;
}

const summary = computed<SummaryItem[]>(() => {
  const vo = data.value;
  return [
    {
      key: 'workorderCount',
      label: $t('mes.analysis.wip.workorderCount'),
      value: vo ? String(vo.workorderCount) : '-',
    },
    {
      key: 'wipQty',
      label: $t('mes.analysis.wip.wipQty'),
      value: formatQty(vo?.wipQty),
    },
    {
      key: 'pendingInputQty',
      label: $t('mes.analysis.wip.pendingInputQty'),
      value: formatQty(vo?.pendingInputQty),
    },
  ];
});

const chartOption = computed(() => {
  const colors = chartColors(isDark.value);
  const { categories, series } = toSeries(rows.value, operationOf, {
    pending: (row) => row.pendingInputQty,
    wip: (row) => row.wipQty,
  });
  return comboOption({
    bars: [
      {
        color: colors.primary,
        data: series.wip ?? [],
        name: $t('mes.analysis.wip.wipQty'),
      },
      {
        color: colors.warning,
        data: series.pending ?? [],
        name: $t('mes.analysis.wip.pendingInputQty'),
      },
    ],
    categories,
    colors,
  });
});

const columns = computed(() => [
  ...(byLine.value
    ? [
        {
          dataIndex: 'lineName',
          key: 'lineName',
          title: $t('mes.analysis.common.line'),
        },
      ]
    : []),
  {
    dataIndex: 'operationCode',
    key: 'operationCode',
    title: $t('mes.analysis.wip.operationCode'),
  },
  {
    dataIndex: 'operationName',
    key: 'operationName',
    title: $t('mes.analysis.wip.operationName'),
  },
  {
    align: 'right' as const,
    dataIndex: 'workorderCount',
    key: 'workorderCount',
    title: $t('mes.analysis.wip.workorderCount'),
  },
  ...(['wipQty', 'pendingInputQty', 'qualifiedQty', 'defectQty'] as const).map(
    (key) => ({
      align: 'right' as const,
      dataIndex: key,
      key,
      title: $t(`mes.analysis.wip.${key}`),
    }),
  ),
]);

onMounted(load);
</script>

<template>
  <Page :title="$t('mes.analysis.wip.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.analysis.wip.description') }}
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
        :dimensions="['operation', 'line']"
        :exporting="exporting"
        :loading="loading"
        @export="exportRows"
        @reset="reset"
        @search="load"
      />

      <AnalysisSummary
        :caliber="$t('mes.analysis.wip.caliber')"
        :failed="failed"
        :items="summary"
        @retry="load"
      />

      <Card :title="$t('mes.analysis.wip.chart')" size="small">
        <AnalysisChart :empty="rows.length === 0" :option="chartOption" />
      </Card>

      <Card :title="$t('mes.analysis.wip.detail')" size="small">
        <Table
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :locale="{ emptyText: $t('mes.analysis.common.empty') }"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :row-key="
            (row: AnalysisApi.WipRow) =>
              `${row.lineId ?? ''}|${row.operationCode}|${row.operationName}`
          "
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lineName'">
              {{
                record.lineId === null || record.lineId === undefined
                  ? labelOf({ key: null, label: '' }, 'line')
                  : record.lineName
              }}
            </template>
            <template v-else-if="column.key === 'operationCode'">
              <span class="font-mono">{{ record.operationCode }}</span>
            </template>
            <template
              v-else-if="
                [
                  'defectQty',
                  'pendingInputQty',
                  'qualifiedQty',
                  'wipQty',
                ].includes(String(column.key))
              "
            >
              {{ formatQty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>
