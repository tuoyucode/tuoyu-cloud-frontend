<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { computed, onMounted } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getWipAnalysis } from '@tuoyu/shared/api/mes/analysis';
import { formatQty, toSeries } from '@tuoyu/shared/pages/mes/analysis-utils';
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

defineOptions({ name: 'MesAnalysisWip' });

const CARD_BODY_STYLE = { padding: '12px 16px' };

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Wip>('wip', getWipAnalysis, 'operation');
const { isDark } = usePreferences();

const rows = computed(() => data.value?.rows ?? []);
const { page, pagedRows, pageSize, total } = useTablePager(rows);

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
          align: undefined,
          key: 'lineName',
          title: $t('mes.analysis.common.line'),
        },
      ]
    : []),
  {
    align: undefined,
    key: 'operationCode',
    title: $t('mes.analysis.wip.operationCode'),
  },
  {
    align: undefined,
    key: 'operationName',
    title: $t('mes.analysis.wip.operationName'),
  },
  {
    align: 'right' as const,
    key: 'workorderCount',
    title: $t('mes.analysis.wip.workorderCount'),
  },
  ...(['wipQty', 'pendingInputQty', 'qualifiedQty', 'defectQty'] as const).map(
    (key) => ({
      align: 'right' as const,
      key,
      title: $t(`mes.analysis.wip.${key}`),
    }),
  ),
]);

function rowKey(row: AnalysisApi.WipRow) {
  return `${row.lineId ?? ''}|${row.operationCode}|${row.operationName}`;
}

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

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">{{ $t('mes.analysis.wip.chart') }}</span>
        </template>
        <AnalysisChart :empty="rows.length === 0" :option="chartOption" />
      </ElCard>

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">{{ $t('mes.analysis.wip.detail') }}</span>
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
            min-width="110"
          >
            <template #default="{ row }">
              <template v-if="column.key === 'lineName'">
                {{
                  row.lineId === null || row.lineId === undefined
                    ? labelOf({ key: null, label: '' }, 'line')
                    : row.lineName
                }}
              </template>
              <template v-else-if="column.key === 'operationCode'">
                <span class="font-mono">{{ row.operationCode }}</span>
              </template>
              <template
                v-else-if="
                  [
                    'defectQty',
                    'pendingInputQty',
                    'qualifiedQty',
                    'wipQty',
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
