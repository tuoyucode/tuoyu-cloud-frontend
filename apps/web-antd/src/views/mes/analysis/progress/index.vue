<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';

import type { SummaryItem } from '../_shared/analysis-utils';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { getProgressAnalysis } from '@tuoyu/shared/api/mes/analysis';
import { Card, Progress, Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import { enumColor, enumLabel } from '../../_shared/enums';
import AnalysisChart from '../_shared/analysis-chart.vue';
import AnalysisFilter from '../_shared/analysis-filter.vue';
import AnalysisSummary from '../_shared/analysis-summary.vue';
import { formatQty, formatRate, toSeries } from '../_shared/analysis-utils';
import { chartColors, comboOption } from '../_shared/charts';
import { useAnalysis } from '../_shared/use-analysis';

defineOptions({ name: 'MesAnalysisProgress' });

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

function onTableChange(pagination: { current?: number; pageSize?: number }) {
  pager.value = {
    page: pagination.current ?? 1,
    pageSize: pagination.pageSize ?? pager.value.pageSize,
  };
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

const pagination = computed(() => ({
  current: pager.value.page,
  pageSize: pager.value.pageSize,
  pageSizeOptions: ['10', '20', '50', '100'],
  showSizeChanger: true,
  total: data.value?.page.total ?? 0,
}));

const columns = computed(() => [
  {
    dataIndex: 'workorderCode',
    fixed: 'left' as const,
    key: 'workorderCode',
    title: $t('mes.analysis.progress.workorderCode'),
    width: 160,
  },
  {
    dataIndex: 'workorderStatus',
    key: 'workorderStatus',
    title: $t('mes.analysis.progress.status'),
    width: 100,
  },
  {
    dataIndex: 'materialName',
    key: 'materialName',
    title: $t('mes.analysis.common.product'),
    width: 200,
  },
  {
    dataIndex: 'workshopName',
    key: 'workshopName',
    title: $t('mes.analysis.common.workshop'),
    width: 120,
  },
  {
    dataIndex: 'lineName',
    key: 'lineName',
    title: $t('mes.analysis.common.line'),
    width: 120,
  },
  ...(['planQty', 'completedQty', 'defectQty', 'stockedQty'] as const).map(
    (key) => ({
      align: 'right' as const,
      dataIndex: key,
      key,
      title: $t(`mes.analysis.progress.${key}`),
      width: 100,
    }),
  ),
  {
    dataIndex: 'completionRate',
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
    dataIndex: key,
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

      <Card :title="$t('mes.analysis.progress.chart')" size="small">
        <AnalysisChart :empty="empty" :option="chartOption" height="280px" />
      </Card>

      <Card :title="$t('mes.analysis.progress.detail')" size="small">
        <Table
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :locale="{ emptyText: $t('mes.analysis.common.empty') }"
          :pagination="pagination"
          :scroll="{ x: 1800 }"
          row-key="workorderId"
          size="small"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'workorderCode'">
              <span class="font-mono">{{ record.workorderCode }}</span>
            </template>
            <template v-else-if="column.key === 'workorderStatus'">
              <Tag
                :color="enumColor('WorkorderStatus', record.workorderStatus)"
              >
                {{ enumLabel('WorkorderStatus', record.workorderStatus) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'materialName'">
              {{ record.materialCode }} {{ record.materialName }}
            </template>
            <template
              v-else-if="
                ['completedQty', 'defectQty', 'planQty', 'stockedQty'].includes(
                  String(column.key),
                )
              "
            >
              {{ formatQty(record[String(column.key)]) }}
            </template>
            <template v-else-if="column.key === 'completionRate'">
              <Progress
                v-if="
                  record.completionRate !== null &&
                  record.completionRate !== undefined
                "
                :percent="Math.min(100, Number(record.completionRate))"
                :status="record.overdue ? 'exception' : 'normal'"
                size="small"
              />
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'planEndTime'">
              {{ record.planEndTime ?? '-' }}
              <Tag v-if="record.overdue" class="ml-2" color="error">
                {{ $t('mes.analysis.progress.overdue') }}
              </Tag>
            </template>
            <template
              v-else-if="
                ['actualEndTime', 'actualStartTime', 'planStartTime'].includes(
                  String(column.key),
                )
              "
            >
              {{ record[String(column.key)] ?? '-' }}
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>
