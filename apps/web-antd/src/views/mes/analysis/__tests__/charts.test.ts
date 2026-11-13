import { describe, expect, it } from 'vitest';

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

describe('分析报表：图表', () => {
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
