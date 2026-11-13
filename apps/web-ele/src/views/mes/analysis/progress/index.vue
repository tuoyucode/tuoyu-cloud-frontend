<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getProgressAnalysis } from '@tuoyu/shared/api/mes/analysis';
import {
  formatQty,
  formatRate,
  toSeries,
} from '@tuoyu/shared/pages/mes/analysis-utils';
import { enumLabel } from '@tuoyu/shared/pages/mes/enums';
import {
  ElCard,
  ElPagination,
  ElProgress,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { $t } from '#/locales';

import EnumTag from '../../_shared/enum-tag.vue';
import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import { chartColors, comboOption } from '../_shared/charts';
import { TABLE_PAGE_SIZES, useAnalysis } from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisProgress' });

const CARD_BODY_STYLE = { padding: '12px 16px' };

/** 工单明细的分页（后端分页，不支持排序） */
const pager = ref({ page: 1, pageSize: 10 });

const { data, exportRows, exporting, failed, filters, load, loading, reset } =
  useAnalysis<AnalysisApi.Progress>('progress', (query) =>
    getProgressAnalysis({ ...query, ...pager.value }),
  );
const { isDark } = usePreferences();

function search() {
  pager.value.page = 1;
  load();
}

function resetAll() {
  pager.value.page = 1;
  reset();
}

/** 翻页或改变每页条数后重新查询（页码与条数已由 v-model 更新） */
function onPageChange(page: number, pageSize: number) {
  pager.value = { page, pageSize };
  load();
}

const summary = computed<SummaryItem[]>(() => {
  const vo = data.value;
  return [
    {
      key: 'workorderCount',
      label: $t('mes.analysis.progress.workorderCount'),
      value: vo ? String(vo.workorderCount) : '-',
    },
    {
      key: 'overdueCount',
      label: $t('mes.analysis.progress.overdueCount'),
      value: vo ? String(vo.overdueCount) : '-',
      warn: (vo?.overdueCount ?? 0) > 0,
    },
    {
      key: 'planQty',
      label: $t('mes.analysis.progress.planQty'),
      value: formatQty(vo?.planQty),
    },
    {
      key: 'completedQty',
      label: $t('mes.analysis.progress.completedQty'),
      value: formatQty(vo?.completedQty),
    },
    {
      key: 'completionRate',
      label: $t('mes.analysis.progress.completionRate'),
      value: formatRate(vo?.completionRate),
    },
  ];
});

const statuses = computed(() => data.value?.statuses ?? []);

const empty = computed(() => (data.value?.workorderCount ?? 0) === 0);

/** 各状态的工单数与其中逾期的数量 */
const chartOption = computed(() => {
  const colors = chartColors(isDark.value);
  const { categories, series } = toSeries(
    statuses.value,
    (row) => enumLabel('WorkorderStatus', row.status),
    {
      onTime: (row) => row.workorderCount - row.overdueCount,
      overdue: (row) => row.overdueCount,
    },
  );
  return comboOption({
    bars: [
      {
        color: colors.primary,
        data: series.onTime ?? [],
        name: $t('mes.analysis.progress.onTime'),
        stack: 'count',
      },
      {
        color: colors.danger,
        data: series.overdue ?? [],
        name: $t('mes.analysis.progress.overdue'),
        stack: 'count',
      },
    ],
    categories,
    colors,
  });
});

const rows = computed(() => data.value?.page.items ?? []);

const total = computed(() => data.value?.page.total ?? 0);

const columns = computed(() => [
  {
    align: undefined,
    fixed: 'left' as const,
    key: 'workorderCode',
    title: $t('mes.analysis.progress.workorderCode'),
    width: 160,
  },
  {
    align: undefined,
    fixed: undefined,
    key: 'workorderStatus',
    title: $t('mes.analysis.progress.status'),
    width: 100,
  },
  {
    align: undefined,
    fixed: undefined,
    key: 'materialName',
    title: $t('mes.analysis.common.product'),
    width: 200,
  },
  {
    align: undefined,
    fixed: undefined,
    key: 'workshopName',
    title: $t('mes.analysis.common.workshop'),
    width: 120,
  },
  {
    align: undefined,
    fixed: undefined,
    key: 'lineName',
    title: $t('mes.analysis.common.line'),
    width: 120,
  },
  ...(['planQty', 'completedQty', 'defectQty', 'stockedQty'] as const).map(
    (key) => ({
      align: 'right' as const,
      fixed: undefined,
      key,
      title: $t(`mes.analysis.progress.${key}`),
      width: 100,
    }),
  ),
  {
    align: undefined,
    fixed: undefined,
    key: 'completionRate',
    title: $t('mes.analysis.progress.completionRate'),
    width: 180,
  },
  ...(
    [
      'planStartTime',
      'planEndTime',
      'actualStartTime',
      'actualEndTime',
    ] as const
  ).map((key) => ({
    align: undefined,
    fixed: undefined,
    key,
    title: $t(`mes.analysis.progress.${key}`),
    width: 170,
  })),
]);

onMounted(load);
</script>

<template>
  <Page :title="$t('mes.analysis.progress.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.analysis.progress.description') }}
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
        @reset="resetAll"
        @search="search"
      />

      <AnalysisSummary
        :caliber="$t('mes.analysis.progress.caliber')"
        :failed="failed"
        :items="summary"
        @retry="load"
      />

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.analysis.progress.chart') }}
          </span>
        </template>
        <AnalysisChart :empty="empty" :option="chartOption" height="280px" />
      </ElCard>

      <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
        <template #header>
          <span class="font-medium">
            {{ $t('mes.analysis.progress.detail') }}
          </span>
        </template>
        <ElTable
          v-loading="loading"
          :data="rows"
          :empty-text="$t('mes.analysis.common.empty')"
          row-key="workorderId"
          size="small"
        >
          <ElTableColumn
            v-for="column in columns"
            :key="column.key"
            :align="column.align"
            :fixed="column.fixed"
            :label="column.title"
            :min-width="column.width"
          >
            <template #default="{ row }">
              <template v-if="column.key === 'workorderCode'">
                <span class="font-mono">{{ row.workorderCode }}</span>
              </template>
              <template v-else-if="column.key === 'workorderStatus'">
                <EnumTag :value="row.workorderStatus" type="WorkorderStatus" />
              </template>
              <template v-else-if="column.key === 'materialName'">
                {{ row.materialCode }} {{ row.materialName }}
              </template>
              <template
                v-else-if="
                  [
                    'completedQty',
                    'defectQty',
                    'planQty',
                    'stockedQty',
                  ].includes(column.key)
                "
              >
                {{ formatQty(row[column.key]) }}
              </template>
              <template v-else-if="column.key === 'completionRate'">
                <ElProgress
                  v-if="
                    row.completionRate !== null &&
                    row.completionRate !== undefined
                  "
                  :percentage="Math.min(100, Number(row.completionRate))"
                  :status="row.overdue ? 'exception' : undefined"
                  :stroke-width="6"
                />
                <span v-else>-</span>
              </template>
              <template v-else-if="column.key === 'planEndTime'">
                {{ row.planEndTime ?? '-' }}
                <ElTag v-if="row.overdue" class="ml-2" type="danger">
                  {{ $t('mes.analysis.progress.overdue') }}
                </ElTag>
              </template>
              <template
                v-else-if="
                  [
                    'actualEndTime',
                    'actualStartTime',
                    'planStartTime',
                  ].includes(column.key)
                "
              >
                {{ row[column.key] ?? '-' }}
              </template>
              <template v-else>{{ row[column.key] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
        <ElPagination
          v-model:current-page="pager.page"
          v-model:page-size="pager.pageSize"
          :page-sizes="TABLE_PAGE_SIZES"
          :total="total"
          class="mt-3 flex-wrap justify-end gap-y-2"
          layout="total, sizes, prev, pager, next"
          size="small"
          @change="onPageChange"
        />
      </ElCard>
    </div>
  </Page>
</template>
