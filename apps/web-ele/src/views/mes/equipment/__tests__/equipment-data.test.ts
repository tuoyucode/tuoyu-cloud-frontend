import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { equipmentEnumLabel } from '@tuoyu/shared/pages/mes/equipment-enums';
import { metricText } from '@tuoyu/shared/pages/mes/equipment-utils';
import { describe, expect, it, vi } from 'vitest';

import { toCheckItemForm, toCheckItemValues } from '../check-item/data';
import {
  canRaiseAndon,
  canVoid,
  toQuery as toRecordQuery,
} from '../check-record/data';
import {
  availableOrderActions,
  toQuery as toOrderQuery,
} from '../maintenance-order/data';
import {
  cycleText,
  detailRows,
  metricDisplay,
  outputText,
  plannedText,
  seriesData,
  summaryCards,
  trendOption,
} from '../oee/data';

/**
 * 页面代码从 #/locales 取 $t，共享包中的工具从 @vben/locales 取，两处用同一份中文文案。
 * 文案在共享包中，按包的入口定位文件（包的 exports 不导出 json）
 */
vi.mock('@vben/locales', async () => {
  const { readFileSync } = await import('node:fs');
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const require = createRequire(import.meta.url);
  const file = new URL(
    'langs/zh-CN/mes/equipment.json',
    pathToFileURL(require.resolve('@tuoyu/shared/locales')),
  );
  const zh = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>;
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

vi.mock('#/locales', async () => {
  const { $t } = await import('@vben/locales');
  return { $t };
});

vi.mock('@tuoyu/shared/api/mes/common', () => ({
  getMesOptions: vi.fn(async () => []),
  toSelectOptions: vi.fn(() => []),
}));

vi.mock('@tuoyu/shared/api/system/dict', () => ({
  DictType: { NORMAL_DISABLE: 'sys_normal_disable' },
  getDictOptions: vi.fn(async () => []),
}));

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

function stat(partial: Partial<EquipmentApi.OeeStat>): EquipmentApi.OeeStat {
  return {
    availabilityStatus: 'ok',
    downtimeMinutes: 0,
    oeeStatus: 'ok',
    outputQty: '0',
    performanceStatus: 'ok',
    qualifiedQty: '0',
    qualityStatus: 'ok',
    ...partial,
  };
}

describe('设备管理：点检项目表单', () => {
  it('点检项目表单：适用范围只提交选中的一项，判定型不提交上下限，数值型校验限值', () => {
    expect(
      toCheckItemForm({
        deviceId: '30',
        deviceType: 'press',
        itemName: '外观',
        lowerLimit: 1,
        resultType: 'judge',
        scope: 'type',
        unit: 'MPa',
      }),
    ).toEqual({
      form: { deviceType: 'press', itemName: '外观', resultType: 'judge' },
    });
    expect(
      toCheckItemForm({
        deviceId: '30',
        itemName: '油压',
        resultType: 'numeric',
        scope: 'device',
      }).error,
    ).toBe('mes.equipment.checkItem.limitsHelp');
    expect(
      toCheckItemForm({
        deviceId: '30',
        itemName: '油压',
        lowerLimit: 5,
        resultType: 'numeric',
        scope: 'device',
        upperLimit: 1,
      }).error,
    ).toBe('mes.equipment.checkItem.limitsHelp');
    expect(
      toCheckItemForm({
        deviceId: '30',
        deviceType: 'press',
        itemName: '油压',
        lowerLimit: 0,
        resultType: 'numeric',
        scope: 'device',
      }),
    ).toEqual({
      form: {
        deviceId: '30',
        itemName: '油压',
        lowerLimit: 0,
        resultType: 'numeric',
      },
    });
    expect(
      toCheckItemValues(item({ deviceId: '30', lowerLimit: '1.5' })),
    ).toMatchObject({
      lowerLimit: 1.5,
      scope: 'device',
      upperLimit: undefined,
    });
    expect(toCheckItemValues(item({ deviceType: 'press' })).scope).toBe('type');
  });
});

describe('设备管理：点检记录与保养工单的动作', () => {
  const record = {
    abnormalCount: 1,
    andonRaised: 'N',
    checkRecordId: '500',
    checkResult: 'abnormal',
    checkTime: '2026-11-10 09:30:00',
    checkerUserId: '8',
    deviceId: '30',
    recordCode: 'DJ001',
    recordStatus: 'completed',
  } satisfies EquipmentApi.CheckRecord;

  it('只有已提交、异常且没有发起过的记录可以发起安灯；已提交的可以作废', () => {
    expect(canRaiseAndon(record)).toBe(true);
    expect(canRaiseAndon({ ...record, andonRaised: 'Y' })).toBe(false);
    expect(canRaiseAndon({ ...record, checkResult: 'normal' })).toBe(false);
    expect(canRaiseAndon({ ...record, recordStatus: 'voided' })).toBe(false);
    expect(canVoid(record)).toBe(true);
    expect(canVoid({ ...record, recordStatus: 'voided' })).toBe(false);
  });

  it('点检时间按整天转为起止时间', () => {
    expect(
      toRecordQuery({
        checkTimeRange: ['2026-11-01', '2026-11-10'],
        deviceId: '30',
      }),
    ).toEqual({
      beginCheckTime: '2026-11-01 00:00:00',
      deviceId: '30',
      endCheckTime: '2026-11-10 23:59:59',
    });
    expect(toRecordQuery({ checkTimeRange: undefined })).toEqual({});
  });

  it('保养工单：按状态给出动作；多选的状态用逗号拼接，到期日期拆为起止', () => {
    expect(availableOrderActions('pending')).toEqual(['start', 'cancel']);
    expect(availableOrderActions('in_progress')).toEqual([
      'complete',
      'cancel',
    ]);
    expect(availableOrderActions('completed')).toEqual([]);
    expect(availableOrderActions()).toEqual([]);
    expect(
      toOrderQuery({
        dueDateRange: ['2026-11-01', '2026-11-30'],
        orderCode: 'BY',
        orderStatus: ['pending', 'in_progress'],
      }),
    ).toEqual({
      beginDueDate: '2026-11-01',
      endDueDate: '2026-11-30',
      orderCode: 'BY',
      orderStatus: 'pending,in_progress',
    });
    expect(toOrderQuery({ orderStatus: [] })).toEqual({});
  });
});

describe('设备管理：OEE 的显示', () => {
  const colors = {
    border: '#e5e7eb',
    danger: '#d9363e',
    muted: '#6b7280',
    primary: '#2a48c1',
    success: '#2f9e44',
    warning: '#c27c0e',
  };

  it('已计算的显示百分数，其他显示原因，不当作 0 或 100%', () => {
    const summary = stat({
      availability: '87.50',
      oee: null,
      oeeStatus: 'unconfigured',
      performance: null,
      performanceStatus: 'unconfigured',
      quality: '95.00',
    });
    expect(metricDisplay(summary, 'availability')).toBe('87.5%');
    expect(metricDisplay(summary, 'performance')).toBe('未配置');
    expect(
      summaryCards(summary).map((card) => [card.value, card.calculated]),
    ).toEqual([
      ['87.5%', true],
      ['未配置', false],
      ['95%', true],
      ['未配置', false],
    ]);
    expect(summaryCards(undefined).every((card) => card.value === '-')).toBe(
      true,
    );
    expect(
      metricText(null, 'idle', (code) =>
        equipmentEnumLabel('OeeMetricStatus', code),
      ),
    ).toBe('无生产');
    expect(metricText(null, '', () => '')).toBe('-');
  });

  it('趋势图：未计算的点为空（图上断开），日期显示月-日', () => {
    const days = [
      stat({ oee: '71.25', statDate: '2026-11-01' }),
      stat({ oee: null, oeeStatus: 'idle', statDate: '2026-11-02' }),
    ];
    expect(seriesData(days, 'oee')).toEqual([71.25, null]);
    const option = trendOption(days, colors) as any;
    expect(option.xAxis.data).toEqual(['11-01', '11-02']);
    expect(option.series).toHaveLength(4);
    expect(option.series[3].data).toEqual([71.25, null]);
    expect(option.tooltip.valueFormatter(null)).toBe('-');
    expect(option.tooltip.valueFormatter(50)).toBe('50%');
  });

  it('口径说明：计划时间、产出来源与标准节拍', () => {
    const base = {
      beginDate: '2026-11-01',
      days: [],
      endDate: '2026-11-07',
      summary: stat({}),
      targetId: '30',
      targetType: 'device' as const,
    };
    expect(plannedText(base)).toBe('未配置');
    expect(
      plannedText({
        ...base,
        plannedMinutesPerDay: 480,
        plannedSource: 'line',
      }),
    ).toBe('480 分钟（取自所属产线的配置）');
    expect(outputText(base)).toBe('设备没有关联工位与产线，没有产出来源');
    expect(
      outputText({
        ...base,
        outputSource: 'station',
        outputSourceName: '冲压工位',
      }),
    ).toBe('工位“冲压工位”的报工');
    expect(
      outputText({ ...base, outputSource: 'line', outputSourceName: '一线' }),
    ).toBe('产线“一线”的报工');
    expect(cycleText(base)).toBe('每条报工对应工序的单件标准工时');
    expect(cycleText({ ...base, cycleMinutes: '1.5000' })).toBe(
      '配置的标准节拍 1.5 分钟/件',
    );
  });

  it('明细：汇总在第一行，其后按日期倒序', () => {
    const rows = detailRows({
      beginDate: '2026-11-01',
      days: [
        stat({ statDate: '2026-11-01' }),
        stat({ statDate: '2026-11-02' }),
      ],
      endDate: '2026-11-02',
      summary: stat({ activeDays: 2 }),
      targetId: '30',
      targetType: 'device',
    });
    expect(rows.map((row) => row.key)).toEqual([
      'summary',
      '2026-11-02',
      '2026-11-01',
    ]);
    expect(rows[0]?.summary).toBe(true);
    expect(detailRows(undefined)).toEqual([]);
  });
});
