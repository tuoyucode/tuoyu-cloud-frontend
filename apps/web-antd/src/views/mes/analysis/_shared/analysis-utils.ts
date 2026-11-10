/**
 * 分析报表的数据转换（纯函数，不依赖界面与文案，单元测试覆盖）：
 * 查询条件与日期范围、数值显示、统计项名称、把接口结果转换为图表的类目与系列。
 * 周、月的归并由后端按日数据完成，这里只按接口给出的区间展示。
 */
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';

/** 统计期间最长天数（含两端），与后端一致 */
export const MAX_DAYS = 366;

/** 项目较多的图表只画前若干项（表格显示全部） */
export const CHART_TOP = 20;

/** 柏拉图的参考线：累计占比 80%（关键的少数） */
export const PARETO_REFERENCE = 80;

/** 默认统计最近 30 天（含今天） */
export const DEFAULT_DAYS = 30;

/** 查询区的状态 */
export interface AnalysisFilters {
  dimension?: AnalysisApi.Dimension;
  factoryId?: string;
  granularity: AnalysisApi.Granularity;
  lineId?: string;
  materialId?: string;
  /** 统计期间 [开始, 结束]，yyyy-MM-dd */
  range?: [string, string];
  workshopId?: string;
}

/** 汇总卡片 */
export interface SummaryItem {
  key: string;
  label: string;
  value: string;
  /** 需要关注（例如逾期、未解决），数字用警示色 */
  warn?: boolean;
}

/** 统计期间的错误 */
export type RangeError = 'empty' | 'reversed' | 'tooLong';

/** 统计项（各报表的明细行都有 key 与 label） */
export interface LabeledRow {
  key?: null | string;
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 本地日期的 yyyy-MM-dd */
export function formatDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 截至 today 的最近 days 天（含 today） */
export function defaultRange(
  today: Date = new Date(),
  days: number = DEFAULT_DAYS,
): [string, string] {
  const begin = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - (days - 1),
  );
  return [formatDay(begin), formatDay(today)];
}

/** 查询区的初始状态：最近 30 天、给定的默认维度、按日 */
export function createFilters(
  dimension?: AnalysisApi.Dimension,
  today: Date = new Date(),
): AnalysisFilters {
  return { dimension, granularity: 'day', range: defaultRange(today) };
}

function dayNumber(value: string): number {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return Number.NaN;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  // 不存在的日期（13 月、2 月 30 日等）会被 Date 顺延，这里拒绝
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return Number.NaN;
  }
  return date.getTime() / DAY_MS;
}

/** 统计期间的天数（含两端）；日期格式不对时为 NaN */
export function rangeDays(begin: string, end: string): number {
  return dayNumber(end) - dayNumber(begin) + 1;
}

/** 校验统计期间：必填、结束不早于开始、最长 MAX_DAYS 天；没有问题时为 null */
export function rangeError(range?: [string, string]): null | RangeError {
  if (!range || !range[0] || !range[1]) {
    return 'empty';
  }
  const days = rangeDays(range[0], range[1]);
  if (Number.isNaN(days)) {
    return 'empty';
  }
  if (days < 1) {
    return 'reversed';
  }
  return days > MAX_DAYS ? 'tooLong' : null;
}

/**
 * 查询区的状态转换为接口参数：没有选择的条件不发送；时间粒度只在按日期统计时发送。
 * 调用前先用 rangeError 校验
 */
export function toQuery(filters: AnalysisFilters): AnalysisApi.Query {
  const [beginDate = '', endDate = ''] = filters.range ?? [];
  const query: AnalysisApi.Query = { beginDate, endDate };
  if (filters.factoryId) {
    query.factoryId = filters.factoryId;
  }
  if (filters.workshopId) {
    query.workshopId = filters.workshopId;
  }
  if (filters.lineId) {
    query.lineId = filters.lineId;
  }
  if (filters.materialId) {
    query.materialId = filters.materialId;
  }
  if (filters.dimension) {
    query.dimension = filters.dimension;
    if (filters.dimension === 'date') {
      query.granularity = filters.granularity;
    }
  }
  return query;
}

/** 接口中的数量或比率转换为数字；为空或不是数字时为 null（图表中显示为缺口） */
export function toNumber(value?: null | number | string): null | number {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** 数量显示：千分位；为空时为 - */
export function formatQty(value?: null | number | string): string {
  const number = toNumber(value);
  return number === null ? '-' : number.toLocaleString();
}

/** 百分数显示；为空时为 -（例如没有报工时的良率） */
export function formatRate(value?: null | number | string): string {
  const number = toNumber(value);
  return number === null ? '-' : `${number}%`;
}

/** 维度对应的状态或类型枚举（统计项的键是枚举编码时，按界面语言显示） */
const ENUM_DIMENSIONS: Partial<Record<AnalysisApi.Dimension, string>> = {
  handleMethod: 'DefectHandleMethod',
  level: 'DefectLevel',
  source: 'DefectSource',
};

/** 键为空时显示“未指定”的维度 */
const UNASSIGNED_DIMENSIONS = new Set<AnalysisApi.Dimension>([
  'handleMethod',
  'line',
  'operation',
  'reason',
  'team',
]);

/**
 * 统计项的显示名称：
 * - 没有键（产线、班组、停机原因、工序、处置方式为空）时用界面语言的“未指定”文案；
 * - 不良等级、来源、处置方式按枚举显示；
 * - 其他用后端给出的名称（产品编码与名称、产线名称、日期区间等）。
 *
 * @param unassigned 维度 → “未指定”的文案
 * @param enumLabel 按枚举类型与编码取文案
 */
export function rowLabel(
  row: LabeledRow,
  dimension: AnalysisApi.Dimension | undefined,
  unassigned: (dimension: AnalysisApi.Dimension) => string,
  enumLabel: (type: string, value: string) => string,
): string {
  if (!dimension) {
    return row.label;
  }
  if (
    (row.key === null || row.key === undefined) &&
    UNASSIGNED_DIMENSIONS.has(dimension)
  ) {
    return unassigned(dimension);
  }
  const enumType = ENUM_DIMENSIONS[dimension];
  if (enumType && row.key) {
    return enumLabel(enumType, row.key);
  }
  return row.label;
}

/** 图表的类目与系列 */
export interface ChartSeries {
  categories: string[];
  series: Record<string, (null | number)[]>;
}

/**
 * 把明细行转换为图表数据：类目为每行的名称，系列为每行的若干数值
 *
 * @param rows 明细行（按图表中的顺序）
 * @param category 行的类目名称
 * @param values 系列名 → 取值
 */
export function toSeries<T>(
  rows: T[],
  category: (row: T) => string,
  values: Record<string, (row: T) => null | number | string | undefined>,
): ChartSeries {
  const series: Record<string, (null | number)[]> = {};
  for (const [name, value] of Object.entries(values)) {
    series[name] = rows.map((row) => toNumber(value(row)));
  }
  return { categories: rows.map((row) => category(row)), series };
}

/**
 * 只取数值最大的前 n 行用于图表（表格仍显示全部），按数值从大到小，数值相同时按传入的先后
 */
export function topRows<T>(
  rows: T[],
  value: (row: T) => null | number | string | undefined,
  n: number,
): T[] {
  if (rows.length <= n) {
    return rows;
  }
  return rows
    .map((row, index) => ({ index, number: toNumber(value(row)) ?? 0, row }))
    .toSorted((a, b) => b.number - a.number || a.index - b.index)
    .slice(0, n)
    .map((item) => item.row);
}

/** 柏拉图的数据：类目、各类数量（柱）与累计占比（折线，0 ~ 100） */
export interface ParetoData {
  categories: string[];
  cumulative: (null | number)[];
  quantities: (null | number)[];
}

/**
 * 柏拉图：行已由后端按数量从多到少排列并给出累计占比；后端没有给出累计占比时（全部为 0）按数量重新计算，
 * 保证折线单调不减、最后为 100（数量都为 0 时为空）
 */
export function paretoData(
  rows: AnalysisApi.DefectRow[],
  label: (row: AnalysisApi.DefectRow) => string,
): ParetoData {
  const quantities = rows.map((row) => toNumber(row.defectQty) ?? 0);
  const total = quantities.reduce((sum, qty) => sum + qty, 0);
  let running = 0;
  const cumulative = rows.map((row, index) => {
    running += quantities[index] ?? 0;
    const given = toNumber(row.cumulativeRatio);
    if (given !== null) {
      return given;
    }
    return total > 0 ? Math.round((running / total) * 10_000) / 100 : null;
  });
  return { categories: rows.map((row) => label(row)), cumulative, quantities };
}

/** 导出文件名：报表名_时间.xlsx（时间为本地时间 yyyyMMdd_HHmmss） */
export function exportFileName(title: string, now: Date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = formatDay(now).replaceAll('-', '');
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${title}_${day}_${time}.xlsx`;
}
