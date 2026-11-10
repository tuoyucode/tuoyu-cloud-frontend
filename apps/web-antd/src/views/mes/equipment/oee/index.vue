<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';
import { formatDate } from '@vben/utils';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { exportOee, getOee } from '@tuoyu/shared/api/mes/equipment';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  Button,
  Card,
  Empty,
  message,
  RadioButton,
  RadioGroup,
  RangePicker,
  Select,
  Table,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { chartColors } from '#/views/mes/dashboard/data';

import {
  daysInRange,
  formatDecimal,
  MAX_OEE_DAYS,
  recentRange,
} from '../common/utils';
import ConfigModal from './config-modal.vue';
import {
  cycleText,
  detailRows,
  metricDisplay,
  METRICS,
  outputText,
  plannedText,
  summaryCards,
  trendOption,
} from './data';

defineOptions({ name: 'MesEquipmentOee' });

const targetType = ref<EquipmentApi.OeeTargetType>('device');
const targetId = ref<string>();
const range = ref<[string, string]>(
  recentRange(formatDate(new Date(), 'YYYY-MM-DD')),
);
const targets = ref<{ label: string; value: string }[]>([]);
const loading = ref(false);
const oee = ref<EquipmentApi.Oee>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();

const [ConfigDialog, configApi] = useVbenModal({
  connectedComponent: ConfigModal,
});

const cards = computed(() => summaryCards(oee.value?.summary));
const rows = computed(() => detailRows(oee.value));
const targetName = computed(
  () =>
    targets.value.find((item) => item.value === targetId.value)?.label ?? '',
);

const columns = computed(() => [
  {
    dataIndex: 'statDate',
    key: 'statDate',
    title: $t('mes.equipment.oee.date'),
    width: 160,
  },
  {
    align: 'right' as const,
    key: 'plannedMinutes',
    title: $t('mes.equipment.oee.plannedTime'),
  },
  {
    align: 'right' as const,
    key: 'downtimeMinutes',
    title: $t('mes.equipment.oee.downtime'),
  },
  {
    align: 'right' as const,
    key: 'runMinutes',
    title: $t('mes.equipment.oee.runTime'),
  },
  {
    align: 'right' as const,
    key: 'outputQty',
    title: $t('mes.equipment.oee.outputQty'),
  },
  {
    align: 'right' as const,
    key: 'qualifiedQty',
    title: $t('mes.equipment.oee.qualifiedQty'),
  },
  {
    align: 'right' as const,
    key: 'idealMinutes',
    title: $t('mes.equipment.oee.idealTime'),
  },
  ...METRICS.map((metric) => ({
    align: 'right' as const,
    key: metric,
    title: $t(`mes.equipment.oee.${metric}`),
  })),
]);

function query(): EquipmentApi.OeeQuery | undefined {
  if (!targetId.value || !range.value) {
    return undefined;
  }
  return {
    beginDate: range.value[0],
    endDate: range.value[1],
    targetId: targetId.value,
    targetType: targetType.value,
  };
}

function validQuery() {
  const current = query();
  if (!current) {
    message.warning($t('mes.equipment.oee.selectTarget'));
    return undefined;
  }
  if (daysInRange(current.beginDate, current.endDate) > MAX_OEE_DAYS) {
    message.warning($t('mes.equipment.oee.rangeTooLong'));
    return undefined;
  }
  return current;
}

function render() {
  if (oee.value) {
    renderEcharts(trendOption(oee.value.days, chartColors()));
  }
}

async function load() {
  const current = validQuery();
  if (!current) {
    return;
  }
  loading.value = true;
  try {
    oee.value = await getOee(current);
    await nextTick();
    render();
  } catch {
    // 失败原因已由请求层提示，保留上一次的结果
  } finally {
    loading.value = false;
  }
}

async function loadTargets() {
  targetId.value = undefined;
  oee.value = undefined;
  try {
    targets.value = toSelectOptions(
      await getMesOptions(targetType.value === 'device' ? 'device' : 'line'),
    );
  } catch {
    // 失败原因已由请求层提示
    targets.value = [];
  }
}

function onConfig() {
  if (!targetId.value) {
    message.warning($t('mes.equipment.oee.selectTarget'));
    return;
  }
  configApi
    .setData({
      name: targetName.value,
      targetId: targetId.value,
      targetType: targetType.value,
    })
    .open();
}

async function onExport() {
  const current = validQuery();
  if (!current) {
    return;
  }
  const fileName = `${$t('mes.equipment.oee.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportOee(current, fileName);
}

/** 明细中的数值列 */
function cellText(record: Record<string, any>, key: string) {
  if ((METRICS as readonly string[]).includes(key)) {
    return metricDisplay(
      record as EquipmentApi.OeeStat,
      key as (typeof METRICS)[number],
    );
  }
  const text = formatDecimal(record[key]);
  return text === '' ? '-' : text;
}

watch(targetType, loadTargets);

// 切换明暗模式后，主题色等变量随之变化，重新绘制
watch(isDark, async () => {
  await nextTick();
  render();
});

onMounted(loadTargets);
</script>

<template>
  <Page :title="$t('mes.equipment.oee.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('mes.equipment.oee.description') }}
      </span>
    </template>
    <template #extra>
      <div class="flex flex-wrap items-center gap-2">
        <RadioGroup v-model:value="targetType" button-style="solid">
          <RadioButton value="device">
            {{ $t('mes.equipment.oee.byDevice') }}
          </RadioButton>
          <RadioButton value="line">
            {{ $t('mes.equipment.oee.byLine') }}
          </RadioButton>
        </RadioGroup>
        <Select
          v-model:value="targetId"
          :options="targets"
          :placeholder="
            targetType === 'device'
              ? $t('mes.equipment.common.devicePlaceholder')
              : $t('mes.equipment.oee.linePlaceholder')
          "
          class="w-56"
          option-filter-prop="label"
          show-search
        />
        <RangePicker
          v-model:value="range"
          :allow-clear="false"
          value-format="YYYY-MM-DD"
        />
        <Button :loading="loading" type="primary" @click="load">
          {{ $t('mes.equipment.oee.query') }}
        </Button>
        <Button
          v-if="hasPermission('mes:equipment:oeeConfig')"
          @click="onConfig"
        >
          {{ $t('mes.equipment.oee.config') }}
        </Button>
        <Button
          v-if="hasPermission('mes:equipment:oeeExport')"
          :disabled="!oee"
          @click="onExport"
        >
          {{ $t('crud.export') }}
        </Button>
      </div>
    </template>

    <ConfigDialog @success="load" />

    <Empty
      v-if="!oee"
      :description="$t('mes.equipment.oee.selectTarget')"
      class="py-16"
    />
    <div v-else class="flex flex-col gap-4">
      <div class="text-muted-foreground text-sm">
        {{ oee.targetName }} · {{ oee.beginDate }} ~ {{ oee.endDate }} ·
        {{
          $t('mes.equipment.oee.activeDays', {
            days: oee.summary.activeDays ?? 0,
          })
        }}
      </div>

      <!-- 汇总卡片 -->
      <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card v-for="card in cards" :key="card.key" size="small">
          <div class="text-muted-foreground text-sm">{{ card.label }}</div>
          <div
            :class="
              card.calculated
                ? 'text-2xl font-semibold'
                : 'text-muted-foreground text-lg'
            "
            class="mt-1 tabular-nums"
          >
            {{ card.value }}
          </div>
        </Card>
      </div>

      <!-- 按日趋势 -->
      <Card :title="$t('mes.equipment.oee.trend')" size="small">
        <EchartsUI ref="chartRef" height="300px" />
      </Card>

      <!-- 明细 -->
      <Card :title="$t('mes.equipment.oee.detail')" size="small">
        <Table
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          :scroll="{ x: 1100, y: 420 }"
          row-key="key"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'statDate'">
              <span v-if="record.summary" class="font-medium">
                {{ $t('mes.equipment.oee.summary') }}
              </span>
              <span v-else>{{ record.statDate }}</span>
            </template>
            <template v-else>
              {{ cellText(record, String(column.key)) }}
            </template>
          </template>
        </Table>
      </Card>

      <!-- 口径说明 -->
      <Card :title="$t('mes.equipment.oee.basis')" size="small">
        <div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <div>
            <span class="text-muted-foreground">
              {{ $t('mes.equipment.oee.currentPlanned') }}：
            </span>
            {{ plannedText(oee) }}
          </div>
          <div>
            <span class="text-muted-foreground">
              {{ $t('mes.equipment.oee.currentOutput') }}：
            </span>
            {{ outputText(oee) }}
          </div>
          <div>
            <span class="text-muted-foreground">
              {{ $t('mes.equipment.oee.currentCycle') }}：
            </span>
            {{ cycleText(oee) }}
          </div>
        </div>
        <ul class="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>{{ $t('mes.equipment.oee.basisAvailability') }}</li>
          <li>{{ $t('mes.equipment.oee.basisPerformance') }}</li>
          <li>{{ $t('mes.equipment.oee.basisQuality') }}</li>
          <li>{{ $t('mes.equipment.oee.basisOee') }}</li>
          <li>{{ $t('mes.equipment.oee.basisScope') }}</li>
        </ul>
      </Card>
    </div>
  </Page>
</template>
