<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getWorkhourAnalysis } from '@tuoyu/shared/api/mes/analysis';
import {
  CHART_TOP,
  formatQty,
  topRows,
  toSeries,
} from '@tuoyu/shared/pages/mes/analysis-utils';
import { ElCard, ElPagination, ElTable, ElTableColumn } from 'element-plus';

import { $t } from '#/locales';

import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import { chartColors, horizontalBarOption } from '../_shared/charts';
import {
  labelOf,
  TABLE_PAGE_SIZES,
  useAnalysis,
  useTablePager,
} from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisWorkhour' });

const CARD_BODY_STYLE = { padding: '12px 16px' };

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Workhour>('workhour', getWorkhourAnalysis, 'user');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);
const { page, pagedRows, pageSize, total } = useTablePager(rows);

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
    align: undefined,
    fixed: 'left' as const,
    key: 'label',
    title: $t(`mes.analysis.dimension.${data.value?.dimension ?? 'user'}`),
    width: 140,
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
    fixed: undefined,
    key,
    title: $t(`mes.analysis.workhour.${key}`),
    width: undefined,
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

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.analysis.workhour.chart', { n: CHART_TOP }) }}
          </span>
        </template>
        <AnalysisChart
          :empty="rows.length === 0"
          :height="chartHeight"
          :option="chartOption"
        />
      </ElCard>

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.analysis.workhour.detail') }}
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
            :fixed="column.fixed"
            :label="column.title"
            :min-width="column.width ?? 110"
          >
            <template #default="{ row }">
              <template v-if="column.key === 'label'">
                {{ labelOfRow(row as AnalysisApi.WorkhourRow) }}
              </template>
              <template v-else-if="column.key === 'missingCount'">
                <span :class="row.missingCount > 0 ? 'text-warning' : ''">
                  {{ row.missingCount }}
                </span>
              </template>
              <template v-else-if="column.key === 'reportCount'">
                {{ row.reportCount }}
              </template>
              <template v-else>
                {{ formatQty(row[column.key]) }}
              </template>
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
