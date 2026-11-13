<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getTeamAnalysis } from '@tuoyu/shared/api/mes/analysis';
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

defineOptions({ name: 'MesAnalysisTeam' });

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Team>('team', getTeamAnalysis);
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);

/** 班组名称：没有班组的报工显示“未指定班组” */
function teamOf(row: AnalysisApi.TeamRow) {
  if (row.teamId === null || row.teamId === undefined) {
    return labelOf({ key: null, label: row.teamName }, 'team');
  }
  return row.teamCode ? `${row.teamCode} ${row.teamName}` : row.teamName;
}

const summary = computed<SummaryItem[]>(() => {
  const vo = data.value;
  return [
    {
      key: 'reportQty',
      label: $t('mes.analysis.team.reportQty'),
      value: formatQty(vo?.reportQty),
    },
    {
      key: 'qualifiedQty',
      label: $t('mes.analysis.team.qualifiedQty'),
      value: formatQty(vo?.qualifiedQty),
    },
    {
      key: 'yieldRate',
      label: $t('mes.analysis.team.yieldRate'),
      value: formatRate(vo?.yieldRate),
    },
    {
      key: 'workHours',
      label: $t('mes.analysis.team.workHours'),
      value: formatQty(vo?.workHours),
    },
    {
      key: 'perCapitaQty',
      label: $t('mes.analysis.team.perCapitaQty'),
      value: formatQty(vo?.perCapitaQty),
    },
  ];
});

/** 各班组的合格数（柱）与良率（折线，右轴百分数） */
const chartOption = computed(() => {
  const colors = chartColors(isDark.value);
  const { categories, series } = toSeries(rows.value, teamOf, {
    perCapita: (row) => row.perCapitaQty,
    qualified: (row) => row.qualifiedQty,
    yield: (row) => row.yieldRate,
  });
  return comboOption({
    bars: [
      {
        color: colors.primary,
        data: series.qualified ?? [],
        name: $t('mes.analysis.team.qualifiedQty'),
      },
      {
        color: colors.warning,
        data: series.perCapita ?? [],
        name: $t('mes.analysis.team.perCapitaQty'),
      },
    ],
    categories,
    colors,
    lines: [
      {
        color: colors.success,
        data: series.yield ?? [],
        name: $t('mes.analysis.team.yieldRate'),
      },
    ],
    rightAxis: 'percent',
  });
});

const columns = computed(() => [
  {
    dataIndex: 'teamName',
    key: 'teamName',
    title: $t('mes.analysis.dimension.team'),
  },
  ...(
    [
      'reportCount',
      'reportQty',
      'qualifiedQty',
      'defectQty',
      'yieldRate',
      'workHours',
      'memberCount',
      'perCapitaQty',
      'qtyPerHour',
      'missingCount',
    ] as const
  ).map((key) => ({
    align: 'right' as const,
    dataIndex: key,
    key,
    title: $t(`mes.analysis.team.${key}`),
  })),
]);

function rowKey(row: AnalysisApi.TeamRow) {
  return row.teamId ?? '';
}

onMounted(load);
</script>

<template>
  <Page :title="$t('mes.analysis.team.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.analysis.team.description') }}
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
        :exporting="exporting"
        :loading="loading"
        @export="exportRows"
        @reset="reset"
        @search="load"
      />

      <AnalysisSummary
        :caliber="$t('mes.analysis.team.caliber')"
        :failed="failed"
        :items="summary"
        @retry="load"
      />

      <Card :title="$t('mes.analysis.team.chart')" size="small">
        <AnalysisChart :empty="rows.length === 0" :option="chartOption" />
      </Card>

      <Card :title="$t('mes.analysis.team.detail')" size="small">
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
            <template v-if="column.key === 'teamName'">
              {{ teamOf(record as AnalysisApi.TeamRow) }}
            </template>
            <template v-else-if="column.key === 'yieldRate'">
              {{ formatRate(record.yieldRate) }}
            </template>
            <template
              v-else-if="
                [
                  'defectQty',
                  'perCapitaQty',
                  'qtyPerHour',
                  'qualifiedQty',
                  'reportQty',
                  'workHours',
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
