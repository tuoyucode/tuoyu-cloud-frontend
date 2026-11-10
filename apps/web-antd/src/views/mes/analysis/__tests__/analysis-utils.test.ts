import { describe, expect, it } from 'vitest';

import enUS from '#/locales/langs/en-US/mes/analysis.json';
import zhCN from '#/locales/langs/zh-CN/mes/analysis.json';

import {
  createFilters,
  defaultRange,
  exportFileName,
  formatQty,
  formatRate,
  MAX_DAYS,
  paretoData,
  rangeDays,
  rangeError,
  rowLabel,
  toNumber,
  topRows,
  toQuery,
  toSeries,
} from '../_shared/analysis-utils';
import {
  comboOption,
  constantLine,
  horizontalBarOption,
} from '../_shared/charts';

const colors = {
  border: '#e5e7eb',
  danger: '#d9363e',
  muted: '#6b7280',
  primary: '#2a48c1',
  success: '#2f9e44',
  warning: '#c27c0e',
};

function keysOf(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('分析报表：统计期间与查询条件', () => {
  it('默认为截至今天的最近 30 天（含今天），跨月、跨年正确', () => {
    expect(defaultRange(new Date(2026, 10, 10))).toEqual([
      '2026-10-12',
      '2026-11-10',
    ]);
    expect(defaultRange(new Date(2027, 0, 5), 7)).toEqual([
      '2026-12-30',
      '2027-01-05',
    ]);
    expect(createFilters('date', new Date(2026, 10, 10))).toEqual({
      dimension: 'date',
      granularity: 'day',
      range: ['2026-10-12', '2026-11-10'],
    });
  });

  it('天数含两端；闰年、跨夏令时按日历日计算', () => {
    expect(rangeDays('2026-11-10', '2026-11-10')).toBe(1);
    expect(rangeDays('2024-01-01', '2024-12-31')).toBe(366);
    expect(rangeDays('2026-03-01', '2026-03-31')).toBe(31);
    expect(rangeDays('2026-13-01', '2026-11-10')).toBeNaN();
  });

  it('校验：必填、结束不早于开始、最长 366 天', () => {
    expect(rangeError(undefined)).toBe('empty');
    expect(rangeError(['', '2026-11-10'])).toBe('empty');
    expect(rangeError(['bad', '2026-11-10'])).toBe('empty');
    expect(rangeError(['2026-11-10', '2026-11-09'])).toBe('reversed');
    expect(rangeError(['2024-01-01', '2024-12-31'])).toBeNull();
    expect(rangeError(['2024-01-01', '2025-01-01'])).toBe('tooLong');
    expect(MAX_DAYS).toBe(366);
  });

  it('接口参数：不发送没有选择的条件，时间粒度只在按日期统计时发送', () => {
    expect(
      toQuery({ granularity: 'week', range: ['2026-11-01', '2026-11-10'] }),
    ).toEqual({ beginDate: '2026-11-01', endDate: '2026-11-10' });
    expect(
      toQuery({
        dimension: 'date',
        factoryId: '1',
        granularity: 'month',
        lineId: '3',
        materialId: '4',
        range: ['2026-11-01', '2026-11-10'],
        workshopId: '2',
      }),
    ).toEqual({
      beginDate: '2026-11-01',
      dimension: 'date',
      endDate: '2026-11-10',
      factoryId: '1',
      granularity: 'month',
      lineId: '3',
      materialId: '4',
      workshopId: '2',
    });
    expect(
      toQuery({
        dimension: 'product',
        granularity: 'month',
        range: ['2026-11-01', '2026-11-10'],
      }).granularity,
    ).toBeUndefined();
  });

  it('导出文件名为“报表名_时间.xlsx”', () => {
    expect(exportFileName('生产进度', new Date(2026, 10, 10, 9, 5, 7))).toBe(
      '生产进度_20261110_090507.xlsx',
    );
  });
});

describe('分析报表：数值与名称', () => {
  it('数量与比率：字符串形式的数字可以显示，空值显示 -，不是数字时为空', () => {
    expect(toNumber('12.50')).toBe(12.5);
    expect(toNumber(0)).toBe(0);
    expect(toNumber(null)).toBeNull();
    expect(toNumber('')).toBeNull();
    expect(toNumber('abc')).toBeNull();
    expect(formatQty('1234.5')).toBe((1234.5).toLocaleString());
    expect(formatQty(undefined)).toBe('-');
    expect(formatRate('66.67')).toBe('66.67%');
    expect(formatRate(null)).toBe('-');
  });

  it('统计项名称：没有键时显示“未指定”，枚举按界面语言显示，其他用后端的名称', () => {
    const unassigned = (dimension: string) => `未指定:${dimension}`;
    const enumLabel = (type: string, value: string) => `${type}.${value}`;
    expect(
      rowLabel(
        { key: null, label: '未指定产线' },
        'line',
        unassigned,
        enumLabel,
      ),
    ).toBe('未指定:line');
    expect(
      rowLabel({ key: 'major', label: '严重' }, 'level', unassigned, enumLabel),
    ).toBe('DefectLevel.major');
    expect(
      rowLabel(
        { key: null, label: '未处置' },
        'handleMethod',
        unassigned,
        enumLabel,
      ),
    ).toBe('未指定:handleMethod');
    expect(
      rowLabel(
        { key: '7', label: 'P-1 齿轮' },
        'product',
        unassigned,
        enumLabel,
      ),
    ).toBe('P-1 齿轮');
    expect(
      rowLabel(
        { key: '2026-11-02', label: '2026-11-02 ~ 2026-11-08' },
        'date',
        unassigned,
        enumLabel,
      ),
    ).toBe('2026-11-02 ~ 2026-11-08');
    expect(rowLabel({ label: '-' }, undefined, unassigned, enumLabel)).toBe(
      '-',
    );
  });
});

describe('分析报表：图表数据', () => {
  const rows = [
    { label: 'A', qty: '10', rate: '50.00' },
    { label: 'B', qty: 30, rate: null },
    { label: 'C', qty: '20', rate: undefined },
  ];

  it('明细行转换为类目与系列，空值成为缺口（null）', () => {
    expect(
      toSeries(rows, (row) => row.label, {
        qty: (row) => row.qty,
        rate: (row) => row.rate,
      }),
    ).toEqual({
      categories: ['A', 'B', 'C'],
      series: { qty: [10, 30, 20], rate: [50, null, null] },
    });
    expect(toSeries([], (row: { label: string }) => row.label, {})).toEqual({
      categories: [],
      series: {},
    });
  });

  it('只取数值最大的前 n 项，数值相同时按传入的先后', () => {
    expect(topRows(rows, (row) => row.qty, 2).map((row) => row.label)).toEqual([
      'B',
      'C',
    ]);
    expect(topRows(rows, (row) => row.qty, 5)).toBe(rows);
    const ties = [
      { label: 'x', qty: 1 },
      { label: 'y', qty: 1 },
      { label: 'z', qty: 2 },
    ];
    expect(topRows(ties, (row) => row.qty, 2).map((row) => row.label)).toEqual([
      'z',
      'x',
    ]);
  });

  it('柏拉图：数量为柱，累计占比用后端的值；后端没有给出时按累计数量计算到 100', () => {
    const fromBackend = paretoData(
      [
        {
          cumulativeRatio: '62.50',
          defectQty: '5',
          label: '焊接',
          recordCount: 2,
        },
        {
          cumulativeRatio: '100.00',
          defectQty: 3,
          label: '装配',
          recordCount: 1,
        },
      ],
      (row) => row.label,
    );
    expect(fromBackend).toEqual({
      categories: ['焊接', '装配'],
      cumulative: [62.5, 100],
      quantities: [5, 3],
    });
    const computed = paretoData(
      [
        { defectQty: '2', label: 'a', recordCount: 1 },
        { defectQty: '1', label: 'b', recordCount: 1 },
      ],
      (row) => row.label,
    );
    expect(computed.cumulative).toEqual([66.67, 100]);
    expect(
      paretoData(
        [{ defectQty: 0, label: 'z', recordCount: 1 }],
        (row) => row.label,
      ).cumulative,
    ).toEqual([null]);
    expect(paretoData([], (row) => row.label)).toEqual({
      categories: [],
      cumulative: [],
      quantities: [],
    });
  });

  it('组合图：柱在左轴，折线在右轴；百分数轴为 0 ~ 100；类目多时横轴文字倾斜', () => {
    const option = comboOption({
      bars: [
        { color: colors.primary, data: [1, 2], name: '合格数', stack: 'qty' },
      ],
      categories: ['A', 'B'],
      colors,
      lines: [{ color: colors.success, data: [90, null], name: '良率' }],
      rightAxis: 'percent',
    }) as Record<string, any>;
    expect(option.series).toHaveLength(2);
    expect(option.series[0]).toMatchObject({ stack: 'qty', type: 'bar' });
    expect(option.series[1]).toMatchObject({ type: 'line', yAxisIndex: 1 });
    expect(option.yAxis).toHaveLength(2);
    expect(option.yAxis[1]).toMatchObject({ max: 100, min: 0 });
    expect(option.xAxis.axisLabel.rotate).toBe(0);

    const many = comboOption({
      bars: [{ color: colors.primary, data: [], name: 'x' }],
      categories: Array.from({ length: 13 }, (_, index) => String(index)),
      colors,
    }) as Record<string, any>;
    expect(many.yAxis).toHaveLength(1);
    expect(many.xAxis.axisLabel.rotate).toBe(30);

    const counts = comboOption({
      bars: [],
      categories: ['A'],
      colors,
      lines: [{ color: colors.primary, data: [3], name: '次数' }],
      rightAxis: 'value',
    }) as Record<string, any>;
    expect(counts.yAxis[1].max).toBeUndefined();
    expect(counts.yAxis[1].minInterval).toBe(1);
  });

  it('横向柱状图自上而下按传入的顺序；参考线每个类目同一个值', () => {
    const option = horizontalBarOption({
      bars: [{ color: colors.primary, data: [3, 2, 1], name: '工时' }],
      categories: ['甲', '乙', '丙'],
      colors,
    }) as Record<string, any>;
    expect(option.yAxis.data).toEqual(['丙', '乙', '甲']);
    expect(option.series[0].data).toEqual([1, 2, 3]);
    expect(constantLine(['a', 'b'], 80)).toEqual([80, 80]);
  });
});

describe('分析报表：文案', () => {
  it('中英文文案的键一致', () => {
    expect(keysOf(enUS).toSorted()).toEqual(keysOf(zhCN).toSorted());
  });
});
