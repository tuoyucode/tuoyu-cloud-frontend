<script lang="ts" setup>
import type { CacheApi } from '@tuoyu/shared/api/monitor/cache';

import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getCacheInfo } from '@tuoyu/shared/api/monitor/cache';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElPagination,
  ElProgress,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { $t } from '#/locales';

defineOptions({ name: 'MonitorCache' });

/** 图表中显示调用次数最多的前几条命令，其余见右侧表格 */
const TOP_COMMANDS = 10;

/** 命令统计表格每页的条数 */
const COMMAND_PAGE_SIZE = 10;

/** 卡片内边距：比 Element Plus 默认的 20px 紧凑 */
const CARD_BODY_STYLE = { padding: '12px 16px' };

const loading = ref(true);
const cache = ref<CacheApi.Info>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();

/** 描述列表的列数：窄屏 1 列、小屏 2 列、超宽屏 3 列（Element Plus 的描述列表不支持响应式列数） */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isSm = breakpoints.greaterOrEqual('sm');
const isXl = breakpoints.greaterOrEqual('xl');
const descColumns = computed(() => {
  if (isXl.value) {
    return 3;
  }
  return isSm.value ? 2 : 1;
});

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

/** 命令统计表格的当前页 */
const commandPage = ref(1);

const pagedCommands = computed(() => {
  const start = (commandPage.value - 1) * COMMAND_PAGE_SIZE;
  return commands.value.slice(start, start + COMMAND_PAGE_SIZE);
});

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
    commandPage.value = 1;
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
      <ElButton :loading="loading" @click="load">
        {{ $t('monitor.cache.refresh') }}
      </ElButton>
    </template>

    <div class="flex flex-col gap-4">
      <!-- 关键指标 -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <ElSkeleton :loading="loading" :rows="1" animated>
            <div class="text-[13px] text-muted-foreground">
              {{ $t('monitor.cache.dbSize') }}
            </div>
            <div class="text-[26px] font-semibold tabular-nums">
              {{ (cache?.dbSize ?? 0).toLocaleString() }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{ $t('monitor.cache.dbSizeDesc') }}
            </div>
          </ElSkeleton>
        </ElCard>
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <ElSkeleton :loading="loading" :rows="1" animated>
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
          </ElSkeleton>
        </ElCard>
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <ElSkeleton :loading="loading" :rows="1" animated>
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
          </ElSkeleton>
        </ElCard>
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <ElSkeleton :loading="loading" :rows="1" animated>
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
          </ElSkeleton>
        </ElCard>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- 基本信息 -->
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <template #header>
            <span class="font-medium">{{ $t('monitor.cache.basic') }}</span>
          </template>
          <ElSkeleton :loading="loading" :rows="4" animated>
            <ElDescriptions :column="descColumns" size="small">
              <ElDescriptionsItem :label="$t('monitor.cache.version')">
                <span class="font-mono">{{ field('redis_version') }}</span>
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.mode')">
                {{
                  field('redis_mode') === 'cluster'
                    ? $t('monitor.cache.modeCluster')
                    : field('redis_mode') === 'sentinel'
                      ? $t('monitor.cache.modeSentinel')
                      : $t('monitor.cache.modeStandalone')
                }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.port')">
                <span class="font-mono">{{ field('tcp_port') }}</span>
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.uptime')">
                {{ uptime }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.role')">
                {{ field('role') }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.os')">
                {{ field('os') }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.network')">
                <span class="tabular-nums">
                  {{
                    $t('monitor.cache.networkValue', {
                      input: field('instantaneous_input_kbps') || '0',
                      output: field('instantaneous_output_kbps') || '0',
                    })
                  }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.totalCommands')">
                <span class="tabular-nums">
                  {{ toNumber('total_commands_processed').toLocaleString() }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.persistence')">
                <span class="inline-flex flex-wrap gap-1">
                  <ElTag
                    :type="persistence.aof ? 'success' : 'info'"
                    disable-transitions
                  >
                    {{
                      persistence.aof
                        ? $t('monitor.cache.aofOn')
                        : $t('monitor.cache.aofOff')
                    }}
                  </ElTag>
                  <ElTag
                    :type="persistence.rdbOk ? 'success' : 'danger'"
                    disable-transitions
                  >
                    {{
                      persistence.rdbOk
                        ? $t('monitor.cache.rdbOk')
                        : $t('monitor.cache.rdbFailed')
                    }}
                  </ElTag>
                </span>
              </ElDescriptionsItem>
            </ElDescriptions>
          </ElSkeleton>
        </ElCard>

        <!-- 内存 -->
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <template #header>
            <span class="font-medium">{{ $t('monitor.cache.memory') }}</span>
          </template>
          <ElSkeleton :loading="loading" :rows="4" animated>
            <div v-if="memory.percent !== null" class="mb-3">
              <div
                class="mb-1 flex justify-between text-xs text-muted-foreground"
              >
                <span>{{ $t('monitor.cache.memoryUsage') }}</span>
                <span class="tabular-nums">
                  {{ field('used_memory_human') }} / {{ memory.max }}
                </span>
              </div>
              <ElProgress
                :percentage="memory.percent"
                :show-text="false"
                :status="memory.percent >= 90 ? 'exception' : ''"
              />
            </div>
            <ElDescriptions :column="descColumns" size="small">
              <ElDescriptionsItem :label="$t('monitor.cache.usedMemory')">
                {{ field('used_memory_human') }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.peakMemory')">
                {{ field('used_memory_peak_human') }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.maxMemory')">
                {{ memory.max }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.rssMemory')">
                {{ field('used_memory_rss_human') }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.luaMemory')">
                {{ field('used_memory_lua_human') }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.systemMemory')">
                {{ field('total_system_memory_human') }}
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.fragmentation')">
                <span class="tabular-nums">
                  {{ field('mem_fragmentation_ratio') }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.evictionPolicy')">
                <span class="font-mono">{{ field('maxmemory_policy') }}</span>
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('monitor.cache.evictedKeys')">
                <span class="tabular-nums">
                  {{ toNumber('evicted_keys').toLocaleString() }}
                </span>
              </ElDescriptionsItem>
            </ElDescriptions>
          </ElSkeleton>
        </ElCard>
      </div>

      <!-- 命令统计 -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ElCard
          :body-style="CARD_BODY_STYLE"
          class="lg:col-span-2"
          shadow="never"
        >
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="font-medium">
                {{ $t('monitor.cache.topCommands', { count: TOP_COMMANDS }) }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{
                  $t('monitor.cache.commandsSummary', {
                    calls: totalCalls.toLocaleString(),
                    count: commands.length,
                  })
                }}
              </span>
            </div>
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
        </ElCard>
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <template #header>
            <span class="font-medium">
              {{ $t('monitor.cache.commandStats') }}
            </span>
          </template>
          <ElTable
            v-loading="loading"
            :data="pagedCommands"
            row-key="name"
            size="small"
          >
            <ElTableColumn
              :label="$t('monitor.cache.command')"
              min-width="100"
              prop="name"
            >
              <template #default="{ row }">
                <span class="font-mono">{{ row.name }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn
              :label="$t('monitor.cache.calls')"
              align="right"
              min-width="90"
              prop="calls"
            >
              <template #default="{ row }">
                <span class="tabular-nums">
                  {{ row.calls.toLocaleString() }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn
              :label="$t('monitor.cache.share')"
              align="right"
              prop="share"
              width="80"
            >
              <template #default="{ row }">
                <span class="tabular-nums">{{ row.share }}</span>
              </template>
            </ElTableColumn>
          </ElTable>
          <div
            v-if="commands.length > COMMAND_PAGE_SIZE"
            class="mt-3 flex justify-end"
          >
            <ElPagination
              v-model:current-page="commandPage"
              :page-size="COMMAND_PAGE_SIZE"
              :total="commands.length"
              layout="prev, pager, next"
              size="small"
            />
          </div>
        </ElCard>
      </div>
    </div>
  </Page>
</template>
