import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { ECOption } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { equipmentEnumLabel } from '../common/enums';
import { metricText, toNumber } from '../common/utils';

/** 四项指标（字段名前缀与后端 MesOeeStatVo 一致） */
export const METRICS = [
  'availability',
  'performance',
  'quality',
  'oee',
] as const;

export type Metric = (typeof METRICS)[number];

/** 图表用的颜色（由页面从主题变量读取后传入） */
export interface OeeChartColors {
  border: string;
  danger: string;
  muted: string;
  primary: string;
  success: string;
  warning: string;
}

/** 指标的值与状态 */
export function metricOf(stat: EquipmentApi.OeeStat, metric: Metric) {
  const status = stat[`${metric}Status`];
  return { status, value: stat[metric] };
}

/** 指标的显示文字：百分数，或“未配置”“无数据”“无生产” */
export function metricDisplay(stat: EquipmentApi.OeeStat, metric: Metric) {
  const { status, value } = metricOf(stat, metric);
  return metricText(value, status, (code) =>
    equipmentEnumLabel('OeeMetricStatus', code),
  );
}

/** 汇总卡片：标题、显示的值、是否已计算（未计算的用次要色显示原因） */
export function summaryCards(summary?: EquipmentApi.OeeStat) {
  return METRICS.map((metric) => ({
    calculated: summary ? metricOf(summary, metric).status === 'ok' : false,
    key: metric,
    label: $t(`mes.equipment.oee.${metric}`),
    value: summary ? metricDisplay(summary, metric) : '-',
  }));
}

/** 趋势图的一条线：已计算的为百分数，其他为空（图上断开，不当作 0） */
export function seriesData(days: EquipmentApi.OeeStat[], metric: Metric) {
  return days.map((day) => {
    const { status, value } = metricOf(day, metric);
    return status === 'ok' ? (toNumber(value) ?? null) : null;
  });
}

/** 按日趋势：四项指标的折线（百分数），OEE 加粗 */
export function trendOption(
  days: EquipmentApi.OeeStat[],
  colors: OeeChartColors,
): ECOption {
  const palette: Record<Metric, string> = {
    availability: colors.success,
    oee: colors.primary,
    performance: colors.warning,
    quality: colors.danger,
  };
  const axisLabel = { color: colors.muted };
  return {
    grid: { bottom: 8, containLabel: true, left: 8, right: 16, top: 40 },
    legend: { textStyle: { color: colors.muted }, top: 0 },
    series: METRICS.map((metric) => ({
      connectNulls: false,
      data: seriesData(days, metric),
      itemStyle: { color: palette[metric] },
      lineStyle: { width: metric === 'oee' ? 3 : 1.5 },
      name: $t(`mes.equipment.oee.${metric}`),
      smooth: true,
      type: 'line' as const,
    })),
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) =>
        value === null || value === undefined ? '-' : `${value}%`,
    },
    xAxis: {
      axisLabel,
      axisLine: { lineStyle: { color: colors.border } },
      data: days.map((day) => (day.statDate ?? '').slice(5)),
      type: 'category',
    },
    yAxis: {
      axisLabel: { ...axisLabel, formatter: '{value}%' },
      min: 0,
      splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
      type: 'value',
    },
  };
}

/** 计划生产时间的说明：多少分钟、取自哪里；未配置时为“未配置” */
export function plannedText(oee?: EquipmentApi.Oee) {
  if (
    !oee ||
    oee.plannedMinutesPerDay === null ||
    oee.plannedMinutesPerDay === undefined
  ) {
    return $t('mes.equipment.oee.notConfigured');
  }
  const minutes = $t('mes.equipment.common.minutes', {
    m: oee.plannedMinutesPerDay,
  });
  const source =
    oee.plannedSource === 'line'
      ? $t('mes.equipment.oee.plannedSourceLine')
      : $t('mes.equipment.oee.plannedSourceDevice');
  return `${minutes}（${source}）`;
}

/** 产出来源的说明 */
export function outputText(oee?: EquipmentApi.Oee) {
  if (!oee?.outputSource) {
    return $t('mes.equipment.oee.outputNone');
  }
  const name = oee.outputSourceName ?? '';
  return oee.outputSource === 'station'
    ? $t('mes.equipment.oee.outputStation', { name })
    : $t('mes.equipment.oee.outputLine', { name });
}

/** 标准节拍的说明 */
export function cycleText(oee?: EquipmentApi.Oee) {
  const value = toNumber(oee?.cycleMinutes);
  return value === undefined
    ? $t('mes.equipment.oee.cycleFromRoute')
    : $t('mes.equipment.oee.cycleFromConfig', { value });
}

/** 明细表的行（最近的日期在上面），第一行为汇总 */
export function detailRows(oee?: EquipmentApi.Oee) {
  if (!oee) {
    return [];
  }
  return [
    { ...oee.summary, key: 'summary', summary: true },
    ...oee.days.toReversed().map((day) => ({
      ...day,
      key: day.statDate ?? '',
      summary: false,
    })),
  ];
}
