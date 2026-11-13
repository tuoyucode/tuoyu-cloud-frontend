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

defineOptions({ name: 'MesAnalysisTeam' });

const CARD_BODY_STYLE = { padding: '12px 16px' };

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Team>('team', getTeamAnalysis);
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);
const { page, pagedRows, pageSize, total } = useTablePager(rows);

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
    align: undefined,
    fixed: 'left' as const,
    key: 'teamName',
    title: $t('mes.analysis.dimension.team'),
    width: 160,
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
    fixed: undefined,
    key,
    title: $t(`mes.analysis.team.${key}`),
    width: undefined,
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

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">{{ $t('mes.analysis.team.chart') }}</span>
        </template>
        <AnalysisChart :empty="rows.length === 0" :option="chartOption" />
      </ElCard>

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">{{ $t('mes.analysis.team.detail') }}</span>
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
            :fixed="column.fixed"
            :label="column.title"
            :min-width="column.width ?? 110"
          >
            <template #default="{ row }">
              <template v-if="column.key === 'teamName'">
                {{ teamOf(row as AnalysisApi.TeamRow) }}
              </template>
              <template v-else-if="column.key === 'yieldRate'">
                {{ formatRate(row.yieldRate) }}
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
                  ].includes(column.key)
                "
              >
                {{ formatQty(row[column.key]) }}
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
