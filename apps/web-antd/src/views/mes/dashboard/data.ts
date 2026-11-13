import type { DashboardApi } from '@tuoyu/shared/api/mes/dashboard';

import type { ECOption } from '@vben/plugins/echarts';

import { enumLabel } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 可选的统计天数 */
export const DAY_OPTIONS = [7, 14, 30, 90] as const;

/** 数量显示：去掉多余的 0；为空时显示 - */
export function qty(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : String(value);
}

/** 百分数显示；为空时显示 - */
export function percent(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  return `${Number(value)}%`;
}

/** 读取主题色等 CSS 变量（形如“228 64% 46%”），转换为 ECharts 能识别的颜色 */
export function cssColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value ? `hsl(${value.split(/\s+/).join(', ')})` : fallback;
}

/** 图表共用的颜色 */
export function chartColors() {
  return {
    border: cssColor('--border', '#e5e7eb'),
    danger: cssColor('--destructive', '#d9363e'),
    muted: cssColor('--muted-foreground', '#6b7280'),
    primary: cssColor('--primary', '#2a48c1'),
    success: cssColor('--success', '#2f9e44'),
    warning: cssColor('--warning', '#c27c0e'),
  };
}

/** 每日趋势：合格数、不良数柱状堆叠，良率折线（右轴） */
export function trendOption(trend: DashboardApi.DailyTrend[]): ECOption {
  const colors = chartColors();
  const axisLabel = { color: colors.muted };
  return {
    grid: { bottom: 8, containLabel: true, left: 8, right: 8, top: 40 },
    legend: { textStyle: { color: colors.muted }, top: 0 },
    series: [
      {
        barMaxWidth: 24,
        data: trend.map((item) => Number(item.qualifiedQty)),
        itemStyle: { color: colors.primary },
        name: $t('mes.dashboard.qualifiedQty'),
        stack: 'qty',
        type: 'bar',
      },
      {
        barMaxWidth: 24,
        data: trend.map((item) => Number(item.defectQty)),
        itemStyle: { color: colors.danger },
        name: $t('mes.dashboard.defectQty'),
        stack: 'qty',
        type: 'bar',
      },
      {
        data: trend.map((item) =>
          item.yieldRate === null || item.yieldRate === undefined
            ? null
            : Number(item.yieldRate),
        ),
        itemStyle: { color: colors.success },
        name: $t('mes.dashboard.yieldRate'),
        smooth: true,
        type: 'line',
        yAxisIndex: 1,
      },
    ],
    tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
    xAxis: {
      axisLabel,
      axisLine: { lineStyle: { color: colors.border } },
      data: trend.map((item) => item.date.slice(5)),
      type: 'category',
    },
    yAxis: [
      {
        axisLabel,
        splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
        type: 'value',
      },
      {
        axisLabel: { ...axisLabel, formatter: '{value}%' },
        max: 100,
        min: 0,
        splitLine: { show: false },
        type: 'value',
      },
    ],
  };
}

/** 不良排行：横向柱状 */
export function defectOption(items: DashboardApi.DefectTop[]): ECOption {
  const colors = chartColors();
  const reversed = items.toReversed();
  return {
    grid: { bottom: 8, containLabel: true, left: 8, right: 24, top: 8 },
    series: [
      {
        barMaxWidth: 16,
        data: reversed.map((item) => Number(item.defectQty)),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: colors.danger },
        name: $t('mes.dashboard.defectQty'),
        type: 'bar',
      },
    ],
    tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
    xAxis: {
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
      type: 'value',
    },
    yAxis: {
      axisLabel: { color: colors.muted },
      axisLine: { lineStyle: { color: colors.border } },
      axisTick: { show: false },
      data: reversed.map((item) => item.operationName),
      type: 'category',
    },
  };
}

/** 安灯类型：数量柱状 */
export function andonOption(items: DashboardApi.AndonTypeStat[]): ECOption {
  const colors = chartColors();
  return {
    grid: { bottom: 8, containLabel: true, left: 8, right: 8, top: 16 },
    series: [
      {
        barMaxWidth: 28,
        data: items.map((item) => item.count),
        itemStyle: { borderRadius: [4, 4, 0, 0], color: colors.warning },
        name: $t('mes.dashboard.andonCount'),
        type: 'bar',
      },
    ],
    tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
    xAxis: {
      axisLabel: { color: colors.muted },
      axisLine: { lineStyle: { color: colors.border } },
      data: items.map((item) => enumLabel('AndonType', item.eventType)),
      type: 'category',
    },
    yAxis: {
      axisLabel: { color: colors.muted },
      minInterval: 1,
      splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
      type: 'value',
    },
  };
}
