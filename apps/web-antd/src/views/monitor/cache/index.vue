<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { CacheApi } from '#/api/monitor/cache';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Progress,
  Table,
  Tag,
} from 'ant-design-vue';

import { getCacheInfo } from '#/api/monitor/cache';
import { $t } from '#/locales';

defineOptions({ name: 'MonitorCache' });

/** 图表中显示调用次数最多的前几条命令，其余见右侧表格 */
const TOP_COMMANDS = 10;

const loading = ref(true);
const cache = ref<CacheApi.Info>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();

/** 读取 INFO 字段，没有时为空字符串 */
function field(key: string) {
  return cache.value?.info?.[key] ?? '';
}

function toNumber(key: string) {
  const value = Number(field(key));
  return Number.isFinite(value) ? value : 0;
}

const uptime = computed(() => {
  const seconds = toNumber('uptime_in_seconds');
  return $t('monitor.cache.uptimeValue', {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3600),
  });
});

const hitRate = computed(() => {
  const hits = toNumber('keyspace_hits');
  const misses = toNumber('keyspace_misses');
  const total = hits + misses;
  return {
    hits,
    misses,
    text: total > 0 ? `${((hits / total) * 100).toFixed(1)}%` : '-',
  };
});

/** 内存上限：0 表示不限，此时不显示占用比例 */
const memory = computed(() => {
  const used = toNumber('used_memory');
  const max = toNumber('maxmemory');
  return {
    max: max > 0 ? field('maxmemory_human') : $t('monitor.cache.unlimited'),
    percent: max > 0 ? Math.min(100, Math.round((used / max) * 100)) : null,
  };
});

/** 持久化状态：AOF 是否开启，RDB 最近一次保存是否成功 */
const persistence = computed(() => ({
  aof: field('aof_enabled') === '1',
  rdbOk: field('rdb_last_bgsave_status') !== 'err',
}));

/** 命令统计，按调用次数从多到少 */
const commands = computed(() => {
  const list = (cache.value?.commandStats ?? []).map((item) => ({
    calls: Number(item.value) || 0,
    name: item.name,
  }));
  list.sort((a, b) => b.calls - a.calls);
  const total = list.reduce((sum, item) => sum + item.calls, 0);
  return list.map((item) => ({
    ...item,
    share: total > 0 ? `${((item.calls / total) * 100).toFixed(1)}%` : '-',
  }));
});

const totalCalls = computed(() =>
  commands.value.reduce((sum, item) => sum + item.calls, 0),
);

const commandColumns = computed(() => [
  {
    dataIndex: 'name',
    key: 'name',
    title: $t('monitor.cache.command'),
  },
  {
    align: 'right' as const,
    dataIndex: 'calls',
    key: 'calls',
    title: $t('monitor.cache.calls'),
  },
  {
    align: 'right' as const,
    dataIndex: 'share',
    key: 'share',
    title: $t('monitor.cache.share'),
    width: 80,
  },
]);

/** 读取主题色等 CSS 变量（形如 “228 64% 46%”），转换为 ECharts 能识别的颜色 */
function cssColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value ? `hsl(${value.split(/\s+/).join(', ')})` : fallback;
}

function renderChart() {
  const top = commands.value.slice(0, TOP_COMMANDS).toReversed();
  const primary = cssColor('--primary', '#2a48c1');
  const muted = cssColor('--muted-foreground', '#6b7280');
  const border = cssColor('--border', '#e5e7eb');
  renderEcharts({
    grid: { bottom: 8, containLabel: true, left: 8, right: 24, top: 8 },
    series: [
      {
        barMaxWidth: 14,
        data: top.map((item) => item.calls),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: primary },
        name: $t('monitor.cache.calls'),
        type: 'bar',
      },
    ],
    tooltip: {
      axisPointer: { type: 'shadow' },
      trigger: 'axis',
      valueFormatter: (value) => Number(value).toLocaleString(),
    },
    xAxis: {
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: border, type: 'dashed' } },
      type: 'value',
    },
    yAxis: {
      axisLabel: { color: muted, fontFamily: 'monospace' },
      axisLine: { lineStyle: { color: border } },
      axisTick: { show: false },
      data: top.map((item) => item.name),
      type: 'category',
    },
  });
}

async function load() {
  loading.value = true;
  try {
    cache.value = await getCacheInfo();
    await nextTick();
    renderChart();
  } finally {
    loading.value = false;
  }
}

// 切换明暗模式后，主题色等变量随之变化，重新绘制
watch(isDark, async () => {
  if (cache.value) {
    await nextTick();
    renderChart();
  }
});

onMounted(load);
</script>

<template>
  <Page :title="$t('monitor.cache.title')">
    <template #description>
      <span class="text-muted-foreground">
        {{ $t('monitor.cache.description') }}
      </span>
    </template>
    <template #extra>
      <Button :loading="loading" @click="load">
        {{ $t('monitor.cache.refresh') }}
      </Button>
    </template>

    <div class="flex flex-col gap-4">
      <!-- 关键指标 -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card :loading="loading" size="small">
          <div class="text-[13px] text-muted-foreground">
            {{ $t('monitor.cache.dbSize') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ (cache?.dbSize ?? 0).toLocaleString() }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{ $t('monitor.cache.dbSizeDesc') }}
          </div>
        </Card>
        <Card :loading="loading" size="small">
          <div class="text-[13px] text-muted-foreground">
            {{ $t('monitor.cache.usedMemory') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ field('used_memory_human') || '-' }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{
              $t('monitor.cache.usedMemoryDesc', {
                max: memory.max,
                peak: field('used_memory_peak_human') || '-',
              })
            }}
          </div>
        </Card>
        <Card :loading="loading" size="small">
          <div class="text-[13px] text-muted-foreground">
            {{ $t('monitor.cache.clients') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ toNumber('connected_clients').toLocaleString() }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{
              $t('monitor.cache.opsPerSec', {
                count: toNumber('instantaneous_ops_per_sec').toLocaleString(),
              })
            }}
          </div>
        </Card>
        <Card :loading="loading" size="small">
          <div class="text-[13px] text-muted-foreground">
            {{ $t('monitor.cache.hitRate') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ hitRate.text }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{
              $t('monitor.cache.hitRateDesc', {
                hits: hitRate.hits.toLocaleString(),
                misses: hitRate.misses.toLocaleString(),
              })
            }}
          </div>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- 基本信息 -->
        <Card
          :loading="loading"
          :title="$t('monitor.cache.basic')"
          size="small"
        >
          <Descriptions :column="{ xs: 1, sm: 2, xl: 3 }" size="small">
            <DescriptionsItem :label="$t('monitor.cache.version')">
              <span class="font-mono">{{ field('redis_version') }}</span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.mode')">
              {{
                field('redis_mode') === 'cluster'
                  ? $t('monitor.cache.modeCluster')
                  : field('redis_mode') === 'sentinel'
                    ? $t('monitor.cache.modeSentinel')
                    : $t('monitor.cache.modeStandalone')
              }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.port')">
              <span class="font-mono">{{ field('tcp_port') }}</span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.uptime')">
              {{ uptime }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.role')">
              {{ field('role') }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.os')">
              {{ field('os') }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.network')">
              <span class="tabular-nums">
                {{
                  $t('monitor.cache.networkValue', {
                    input: field('instantaneous_input_kbps') || '0',
                    output: field('instantaneous_output_kbps') || '0',
                  })
                }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.totalCommands')">
              <span class="tabular-nums">
                {{ toNumber('total_commands_processed').toLocaleString() }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.persistence')">
              <span class="flex flex-wrap gap-1">
                <Tag
                  :bordered="false"
                  :color="persistence.aof ? 'success' : 'default'"
                >
                  {{
                    persistence.aof
                      ? $t('monitor.cache.aofOn')
                      : $t('monitor.cache.aofOff')
                  }}
                </Tag>
                <Tag
                  :bordered="false"
                  :color="persistence.rdbOk ? 'success' : 'error'"
                >
                  {{
                    persistence.rdbOk
                      ? $t('monitor.cache.rdbOk')
                      : $t('monitor.cache.rdbFailed')
                  }}
                </Tag>
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <!-- 内存 -->
        <Card
          :loading="loading"
          :title="$t('monitor.cache.memory')"
          size="small"
        >
          <div v-if="memory.percent !== null" class="mb-3">
            <div
              class="mb-1 flex justify-between text-xs text-muted-foreground"
            >
              <span>{{ $t('monitor.cache.memoryUsage') }}</span>
              <span class="tabular-nums">
                {{ field('used_memory_human') }} / {{ memory.max }}
              </span>
            </div>
            <Progress
              :percent="memory.percent"
              :show-info="false"
              :status="memory.percent >= 90 ? 'exception' : 'normal'"
              size="small"
            />
          </div>
          <Descriptions :column="{ xs: 1, sm: 2, xl: 3 }" size="small">
            <DescriptionsItem :label="$t('monitor.cache.usedMemory')">
              {{ field('used_memory_human') }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.peakMemory')">
              {{ field('used_memory_peak_human') }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.maxMemory')">
              {{ memory.max }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.rssMemory')">
              {{ field('used_memory_rss_human') }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.luaMemory')">
              {{ field('used_memory_lua_human') }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.systemMemory')">
              {{ field('total_system_memory_human') }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.fragmentation')">
              <span class="tabular-nums">
                {{ field('mem_fragmentation_ratio') }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.evictionPolicy')">
              <span class="font-mono">{{ field('maxmemory_policy') }}</span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('monitor.cache.evictedKeys')">
              <span class="tabular-nums">
                {{ toNumber('evicted_keys').toLocaleString() }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>

      <!-- 命令统计 -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          :title="$t('monitor.cache.topCommands', { count: TOP_COMMANDS })"
          class="lg:col-span-2"
          size="small"
        >
          <template #extra>
            <span class="text-xs text-muted-foreground">
              {{
                $t('monitor.cache.commandsSummary', {
                  calls: totalCalls.toLocaleString(),
                  count: commands.length,
                })
              }}
            </span>
          </template>
          <EchartsUI
            v-show="commands.length > 0"
            ref="chartRef"
            height="320px"
          />
          <div
            v-if="!loading && commands.length === 0"
            class="py-12 text-center text-sm text-muted-foreground"
          >
            {{ $t('monitor.cache.noCommands') }}
          </div>
        </Card>
        <Card :title="$t('monitor.cache.commandStats')" size="small">
          <Table
            :columns="commandColumns"
            :data-source="commands"
            :loading="loading"
            :pagination="{
              pageSize: 10,
              showSizeChanger: false,
              size: 'small',
            }"
            row-key="name"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <span v-if="column.key === 'name'" class="font-mono">
                {{ record.name }}
              </span>
              <span v-else class="tabular-nums">
                {{
                  column.key === 'calls'
                    ? record.calls.toLocaleString()
                    : record.share
                }}
              </span>
            </template>
          </Table>
        </Card>
      </div>
    </div>
  </Page>
</template>
