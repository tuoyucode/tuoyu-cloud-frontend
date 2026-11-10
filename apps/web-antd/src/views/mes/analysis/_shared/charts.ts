/**
 * 分析报表的图表配置（ECharts）。构造函数是纯函数：颜色与系列名称由调用方传入，
 * 颜色从 CSS 变量读取（chartColors），切换明暗模式后页面重新计算配置即可。
 */
import type { ECOption } from '@vben/plugins/echarts';

/** 图表共用的颜色 */
export interface ChartColors {
  border: string;
  danger: string;
  muted: string;
  primary: string;
  success: string;
  warning: string;
}

/** 柱状系列 */
export interface BarSeries {
  color: string;
  data: (null | number)[];
  name: string;
  /** 同一 stack 的柱堆叠显示 */
  stack?: string;
}

/** 折线系列（画在右侧坐标轴） */
export interface LineSeries {
  color: string;
  data: (null | number)[];
  /** 虚线（参考线） */
  dashed?: boolean;
  name: string;
}

/** 组合图：左轴为柱，右轴为折线 */
export interface ComboChart {
  bars: BarSeries[];
  categories: string[];
  colors: ChartColors;
  lines?: LineSeries[];
  /** 右轴：percent 为 0 ~ 100 的百分数，value 为普通数值 */
  rightAxis?: 'percent' | 'value';
}

/** 读取主题色等 CSS 变量（形如“228 64% 46%”），转换为 ECharts 能识别的颜色 */
export function cssColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value ? `hsl(${value.split(/\s+/).join(', ')})` : fallback;
}

/**
 * 当前主题下图表共用的颜色
 *
 * @param _dark 是否暗色模式：只用于让调用方的计算属性依赖明暗模式，切换后重新取色
 */
export function chartColors(_dark?: boolean): ChartColors {
  return {
    border: cssColor('--border', '#e5e7eb'),
    danger: cssColor('--destructive', '#d9363e'),
    muted: cssColor('--muted-foreground', '#6b7280'),
    primary: cssColor('--primary', '#2a48c1'),
    success: cssColor('--success', '#2f9e44'),
    warning: cssColor('--warning', '#c27c0e'),
  };
}

/** 柱状 + 折线的组合图；类目较多时横轴文字倾斜 */
export function comboOption(chart: ComboChart): ECOption {
  const { colors } = chart;
  const axisLabel = { color: colors.muted };
  const lines = chart.lines ?? [];
  const hasRight = lines.length > 0;
  const rotate = chart.categories.length > 12 ? 30 : 0;
  return {
    grid: { bottom: 8, containLabel: true, left: 8, right: 8, top: 40 },
    legend: { textStyle: { color: colors.muted }, top: 0, type: 'scroll' },
    series: [
      ...chart.bars.map((bar) => ({
        barMaxWidth: 28,
        data: bar.data,
        itemStyle: { color: bar.color },
        name: bar.name,
        stack: bar.stack,
        type: 'bar' as const,
      })),
      ...lines.map((line) => ({
        connectNulls: false,
        data: line.data,
        itemStyle: { color: line.color },
        lineStyle: line.dashed
          ? { type: 'dashed' as const, width: 1 }
          : undefined,
        name: line.name,
        showSymbol: !line.dashed,
        smooth: false,
        type: 'line' as const,
        yAxisIndex: 1,
      })),
    ],
    tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
    xAxis: {
      axisLabel: { ...axisLabel, hideOverlap: true, rotate },
      axisLine: { lineStyle: { color: colors.border } },
      data: chart.categories,
      type: 'category',
    },
    yAxis: [
      {
        axisLabel,
        splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
        type: 'value',
      },
      ...(hasRight
        ? [
            chart.rightAxis === 'percent'
              ? {
                  axisLabel: { ...axisLabel, formatter: '{value}%' },
                  max: 100,
                  min: 0,
                  splitLine: { show: false },
                  type: 'value' as const,
                }
              : {
                  axisLabel,
                  minInterval: 1,
                  splitLine: { show: false },
                  type: 'value' as const,
                },
          ]
        : []),
    ],
  };
}

/** 横向柱状图（名称较长、项目较多时，例如人员、工序） */
export function horizontalBarOption(chart: {
  bars: BarSeries[];
  categories: string[];
  colors: ChartColors;
}): ECOption {
  const { colors } = chart;
  // 自上而下按传入的顺序显示
  const categories = chart.categories.toReversed();
  return {
    grid: { bottom: 8, containLabel: true, left: 8, right: 24, top: 32 },
    legend: { textStyle: { color: colors.muted }, top: 0 },
    series: chart.bars.map((bar) => ({
      barMaxWidth: 16,
      data: bar.data.toReversed(),
      itemStyle: { color: bar.color },
      name: bar.name,
      stack: bar.stack,
      type: 'bar' as const,
    })),
    tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
    xAxis: {
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
      type: 'value',
    },
    yAxis: {
      axisLabel: { color: colors.muted, width: 160, overflow: 'truncate' },
      axisLine: { lineStyle: { color: colors.border } },
      axisTick: { show: false },
      data: categories,
      type: 'category',
    },
  };
}

/** 参考线（例如柏拉图的 80%）：每个类目同一个值 */
export function constantLine(categories: string[], value: number): number[] {
  return categories.map(() => value);
}
