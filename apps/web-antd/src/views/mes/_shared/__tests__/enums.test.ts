import { describe, expect, it, vi } from 'vitest';

import enUS from '#/locales/langs/en-US/mes/enums.json';
import zhCN from '#/locales/langs/zh-CN/mes/enums.json';

import { enumColor, enumLabel, enumOptions, MES_ENUMS } from '../enums';

type EnumLabels = Record<string, Record<string, string>>;

vi.mock('#/locales', async () => {
  const module = await import('#/locales/langs/zh-CN/mes/enums.json');
  const zh = module.default as EnumLabels;
  return {
    // mes.enums.<类型>.<值> → 中文文案；没有时返回键本身（与 vue-i18n 一致）
    $t: (key: string) => {
      const parts = key.split('.');
      return zh[parts[2] as string]?.[parts[3] as string] ?? key;
    },
  };
});

describe('制造执行的状态与类型', () => {
  it('每个值在中英文文案中都有对应的文字，文案中也没有多余的值', () => {
    for (const [lang, locale] of [
      ['zh-CN', zhCN as EnumLabels],
      ['en-US', enUS as EnumLabels],
    ] as const) {
      expect(Object.keys(locale).toSorted()).toEqual(
        Object.keys(MES_ENUMS).toSorted(),
      );
      for (const [type, items] of Object.entries(MES_ENUMS)) {
        expect(
          Object.keys(locale[type] ?? {}).toSorted(),
          `${lang} ${type}`,
        ).toEqual(items.map((item) => item.value).toSorted());
      }
    }
  });

  it('下拉选项按定义的顺序给出文案与值', () => {
    expect(enumOptions('WorkorderStatus').map((item) => item.value)).toEqual([
      'draft',
      'released',
      'in_progress',
      'paused',
      'completed',
      'closed',
      'cancelled',
    ]);
    expect(enumOptions('InspectionResult')[0]).toEqual({
      label: '合格',
      value: 'passed',
    });
  });

  it('空值显示为空，未知的值原样显示，颜色缺省为 default', () => {
    expect(enumLabel('WorkorderStatus', 'released')).toBe('已下达');
    expect(enumLabel('WorkorderStatus', undefined)).toBe('');
    expect(enumLabel('WorkorderStatus', '')).toBe('');
    expect(enumLabel('WorkorderStatus', 'unknown')).toBe('unknown');
    expect(enumColor('InspectionResult', 'rejected')).toBe('error');
    expect(enumColor('InspectionResult', 'unknown')).toBe('default');
  });
});
