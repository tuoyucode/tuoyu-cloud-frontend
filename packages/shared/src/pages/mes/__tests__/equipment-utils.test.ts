import type { EquipmentApi } from '../../../api/mes/equipment';

import { describe, expect, it, vi } from 'vitest';

import enUS from '../../../locales/langs/en-US/mes/equipment.json';
import zhCN from '../../../locales/langs/zh-CN/mes/equipment.json';
import {
  EQUIPMENT_ENUMS,
  equipmentEnumLabel,
  equipmentEnumOptions,
} from '../equipment-enums';
import {
  abnormalCount,
  addDays,
  daysInRange,
  formatDecimal,
  judgeMeasured,
  limitsText,
  missingMandatory,
  recentRange,
  statusChange,
  toCheckRecordForm,
  toNumber,
} from '../equipment-utils';

vi.mock('@vben/locales', async () => {
  const module =
    await import('../../../locales/langs/zh-CN/mes/equipment.json');
  const zh = module.default as Record<string, any>;
  return {
    // mes.equipment.<路径> → 中文文案（按 {name} 替换参数）；没有时返回键本身（与 vue-i18n 一致）
    $t: (key: string, params?: Record<string, unknown>) => {
      if (!key.startsWith('mes.equipment.')) {
        return key;
      }
      let value: any = zh;
      for (const part of key.slice('mes.equipment.'.length).split('.')) {
        value = value?.[part];
      }
      if (typeof value !== 'string') {
        return key;
      }
      return value.replaceAll(/\{(\w+)\}/g, (_: string, name: string) =>
        String(params?.[name] ?? ''),
      );
    },
  };
});

function item(
  partial: Partial<EquipmentApi.CheckItem>,
): EquipmentApi.CheckItem {
  return {
    checkItemId: '1',
    itemName: '外观',
    mandatory: 'Y',
    resultType: 'judge',
    sortNo: 0,
    status: '0',
    ...partial,
  };
}

describe('设备管理：状态与类型的文案', () => {
  it('每个值在中英文文案中都有对应的文字，文案中也没有多余的值', () => {
    for (const locale of [zhCN, enUS]) {
      const enums = locale.enums as Record<string, Record<string, string>>;
      expect(Object.keys(enums).toSorted()).toEqual(
        Object.keys(EQUIPMENT_ENUMS).toSorted(),
      );
      for (const [type, items] of Object.entries(EQUIPMENT_ENUMS)) {
        expect(Object.keys(enums[type] ?? {}).toSorted()).toEqual(
          items.map((entry) => entry.value).toSorted(),
        );
      }
    }
  });

  it('中英文文案的键一致', () => {
    const keys = (value: unknown, prefix = ''): string[] =>
      value && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, child]) =>
            keys(child, `${prefix}${key}.`),
          )
        : [prefix];
    expect(keys(enUS).toSorted()).toEqual(keys(zhCN).toSorted());
  });

  it('选项与文案；未知的值原样显示', () => {
    expect(equipmentEnumOptions('CheckResult')).toEqual([
      { label: '正常', value: 'normal' },
      { label: '异常', value: 'abnormal' },
    ]);
    expect(equipmentEnumLabel('MaintenanceOrderStatus', 'in_progress')).toBe(
      '保养中',
    );
    expect(equipmentEnumLabel('MaintenanceOrderStatus', 'unknown')).toBe(
      'unknown',
    );
    expect(equipmentEnumLabel('MaintenanceOrderStatus', null)).toBe('');
  });
});

describe('设备管理：数值与点检判定', () => {
  it('后端的 BigDecimal 字符串转为数字，去掉多余的 0', () => {
    expect(toNumber('85.500')).toBe(85.5);
    expect(toNumber('')).toBeUndefined();
    expect(toNumber('abc')).toBeUndefined();
    expect(formatDecimal('2.000000')).toBe('2');
    expect(formatDecimal(null)).toBe('');
  });

  it('合格范围的文字', () => {
    expect(limitsText('1.000000', '5', 'MPa')).toBe('1 ~ 5 MPa');
    expect(limitsText('1', null)).toBe('≥ 1');
    expect(limitsText(undefined, '5')).toBe('≤ 5');
    expect(limitsText(null, null, 'MPa')).toBe('');
  });

  it('数值判定与后端一致：等于上下限算合格，超出为不合格，没有值时不判定', () => {
    expect(judgeMeasured(1, '1', '5')).toBe('ok');
    expect(judgeMeasured(5, '1', '5')).toBe('ok');
    expect(judgeMeasured(0.99, '1', '5')).toBe('ng');
    expect(judgeMeasured('5.01', undefined, '5')).toBe('ng');
    expect(judgeMeasured(-100, undefined, '5')).toBe('ok');
    expect(judgeMeasured(undefined, '1', '5')).toBeUndefined();
  });

  it('提交参数：只提交填写了结果的项目，数值型只发测量值，判定型只发结论', () => {
    const rows = [
      { item: item({ checkItemId: '1' }), itemResult: 'ok', remark: '  ' },
      {
        item: item({
          checkItemId: '2',
          lowerLimit: '1',
          resultType: 'numeric',
          upperLimit: '5',
        }),
        itemResult: 'ok',
        measuredValue: 6,
        remark: ' 偏高 ',
      },
      { item: item({ checkItemId: '3', mandatory: 'N' }) },
    ];
    expect(abnormalCount(rows)).toBe(1);
    expect(missingMandatory(rows)).toEqual([]);
    expect(toCheckRecordForm('30', rows, ' 早班 ')).toEqual({
      details: [
        { checkItemId: '1', itemResult: 'ok' },
        { checkItemId: '2', measuredValue: 6, remark: '偏高' },
      ],
      deviceId: '30',
      remark: '早班',
    });
    expect(toCheckRecordForm('30', [], '')).toEqual({
      details: [],
      deviceId: '30',
    });
  });

  it('必检项没有填写时列出名称', () => {
    expect(
      missingMandatory([
        {
          item: item({
            itemName: '油压',
            resultType: 'numeric',
            upperLimit: '5',
          }),
        },
        { item: item({ itemName: '外观' }), itemResult: 'bad' },
        { item: item({ itemName: '噪声', mandatory: 'N' }) },
      ]),
    ).toEqual(['油压', '外观']);
  });
});

describe('设备管理：状态履历', () => {
  it('状态履历：前后相同时只显示一个，新建时只有目标状态', () => {
    const label = (value: string) =>
      equipmentEnumLabel('CheckRecordStatus', value);
    const log = {
      action: 'void',
      logId: '1',
      operateTime: '',
      toStatus: 'voided',
    };
    expect(statusChange({ ...log, fromStatus: 'completed' }, label)).toBe(
      '已提交 → 已作废',
    );
    expect(statusChange(log, label)).toBe('已作废');
    expect(statusChange({ ...log, fromStatus: 'voided' }, label)).toBe(
      '已作废',
    );
  });
});

describe('设备管理：OEE 的日期范围', () => {
  it('日期范围：含首尾的天数、加减天数与默认最近 7 天', () => {
    expect(daysInRange('2026-11-01', '2026-11-01')).toBe(1);
    expect(daysInRange('2025-11-01', '2026-11-01')).toBe(366);
    expect(daysInRange('bad', '2026-11-01')).toBe(0);
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(recentRange('2026-11-10')).toEqual(['2026-11-04', '2026-11-10']);
  });
});
