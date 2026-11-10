<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';

import type { SummaryItem } from '../_shared/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getDefectAnalysis } from '@tuoyu/shared/api/mes/analysis';
import { Card, Table } from 'ant-design-vue';

import { $t } from '#/locales';

import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import {
  formatQty,
  formatRate,
  PARETO_REFERENCE,
  paretoData,
} from '../_shared/analysis-utils';
import { chartColors, comboOption, constantLine } from '../_shared/charts';
import { labelOf, useAnalysis } from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisDefect' });

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Defect>('defect', getDefectAnalysis, 'operation');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);

function labelOfRow(row: AnalysisApi.DefectRow) {
  return labelOf(row, data.value?.dimension);
}

const summary = computed<SummaryItem[]>(() => {
  const vo = data.value;
  const top = vo?.rows[0];
  return [
    {
      key: 'recordCount',
      label: $t('mes.analysis.defect.recordCount'),
      value: vo ? String(vo.recordCount) : '-',
    },
    {
      key: 'defectQty',
      label: $t('mes.analysis.defect.defectQty'),
      value: formatQty(vo?.defectQty),
    },
    {
      key: 'categoryCount',
      label: $t('mes.analysis.defect.categoryCount'),
      value: vo ? String(vo.rows.length) : '-',
    },
    {
      key: 'top',
      label: $t('mes.analysis.defect.top'),
      value: top ? `${labelOfRow(top)}（${formatRate(top.ratio)}）` : '-',
    },
  ];
});

/** 柏拉图：不良数量柱状（从多到少）+ 累计占比折线 + 80% 参考线 */
const chartOption = computed(() => {
  const colors = chartColors(isDark.value);
  const pareto = paretoData(rows.value, labelOfRow);
  return comboOption({
    bars: [
      {
        color: colors.danger,
        data: pareto.quantities,
        name: $t('mes.analysis.defect.defectQty'),
      },
    ],
    categories: pareto.categories,
    colors,
    lines: [
      {
        color: colors.primary,
        data: pareto.cumulative,
        name: $t('mes.analysis.defect.cumulativeRatio'),
      },
      {
        color: colors.muted,
        dashed: true,
        data: constantLine(pareto.categories, PARETO_REFERENCE),
        name: $t('mes.analysis.defect.reference', { ratio: PARETO_REFERENCE }),
      },
    ],
    rightAxis: 'percent',
  });
});

const columns = computed(() => [
  {
    key: 'rank',
    title: $t('mes.analysis.defect.rank'),
    width: 64,
  },
  {
    dataIndex: 'label',
    key: 'label',
    title: $t(`mes.analysis.dimension.${data.value?.dimension ?? 'operation'}`),
  },
  {
    align: 'right' as const,
    dataIndex: 'recordCount',
    key: 'recordCount',
    title: $t('mes.analysis.defect.recordCount'),
  },
  {
    align: 'right' as const,
    dataIndex: 'defectQty',
    key: 'defectQty',
    title: $t('mes.analysis.defect.defectQty'),
  },
  ...(['ratio', 'cumulativeRatio'] as const).map((key) => ({
    align: 'right' as const,
    dataIndex: key,
    key,
    title: $t(`mes.analysis.defect.${key}`),
  })),
]);

function rowKey(row: AnalysisApi.DefectRow) {
  return `${row.key ?? ''}|${row.label}`;
}

onMounted(load);
</script>

<template>
  <Page :title="$t('mes.analysis.defect.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.analysis.defect.description') }}
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
        :dimensions="[
          'operation',
          'level',
          'source',
          'handleMethod',
          'product',
        ]"
        :exporting="exporting"
        :loading="loading"
        @export="exportRows"
        @reset="reset"
        @search="load"
      />

      <AnalysisSummary
        :caliber="$t('mes.analysis.defect.caliber')"
        :failed="failed"
        :items="summary"
        @retry="load"
      />

      <Card :title="$t('mes.analysis.defect.chart')" size="small">
        <AnalysisChart :empty="rows.length === 0" :option="chartOption" />
      </Card>

      <Card :title="$t('mes.analysis.defect.detail')" size="small">
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
            <template v-if="column.key === 'rank'">
              {{ rows.indexOf(record as AnalysisApi.DefectRow) + 1 }}
            </template>
            <template v-else-if="column.key === 'label'">
              {{ labelOfRow(record as AnalysisApi.DefectRow) }}
            </template>
            <template v-else-if="column.key === 'defectQty'">
              {{ formatQty(record.defectQty) }}
            </template>
            <template
              v-else-if="
                ['cumulativeRatio', 'ratio'].includes(String(column.key))
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
