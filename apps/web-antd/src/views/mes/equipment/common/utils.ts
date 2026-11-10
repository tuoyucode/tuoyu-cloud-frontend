/**
 * 设备管理页面共用的纯函数：数值显示、点检的判定与提交参数、OEE 指标的显示与日期范围。
 * 不依赖界面组件，便于单元测试。
 */
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { $t } from '#/locales';

/** 填写原因后执行的动作（作废点检记录、取消保养工单），作为 reason-modal 的打开参数 */
export interface ReasonModalData {
  /** 输入框上方的说明，可为空 */
  description?: string;
  /** 确认按钮的文字（写清动作） */
  okText: string;
  /** 提交原因；成功后关闭对话框并触发 success */
  submit: (reason: string) => Promise<unknown>;
  title: string;
}

/** OEE 指标的计算状态（与后端 OeeMetricStatus 一致） */
export const METRIC_OK = 'ok';

/** OEE 的日期范围最长天数（含首尾） */
export const MAX_OEE_DAYS = 366;

/** 后端的 BigDecimal（字符串）或数字转为数字；为空或不是数字时为 undefined */
export function toNumber(value?: EquipmentApi.Decimal | null) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** 数值显示：去掉多余的 0；为空时为空串 */
export function formatDecimal(value?: EquipmentApi.Decimal | null) {
  const number = toNumber(value);
  return number === undefined ? '' : String(number);
}

/** 合格范围的文字，例如“1 ~ 5 MPa”“≥ 1”“≤ 5” */
export function limitsText(
  lower?: EquipmentApi.Decimal | null,
  upper?: EquipmentApi.Decimal | null,
  unit?: null | string,
) {
  const low = formatDecimal(lower);
  const high = formatDecimal(upper);
  let text = '';
  if (low && high) {
    text = `${low} ~ ${high}`;
  } else if (low) {
    text = `≥ ${low}`;
  } else if (high) {
    text = `≤ ${high}`;
  }
  return text && unit ? `${text} ${unit}` : text;
}

/**
 * 数值型项目的判定（与后端一致）：低于下限或高于上限为不合格，等于上下限算合格；
 * 没有填写测量值时为 undefined
 */
export function judgeMeasured(
  value: EquipmentApi.Decimal | null | undefined,
  lower?: EquipmentApi.Decimal | null,
  upper?: EquipmentApi.Decimal | null,
): 'ng' | 'ok' | undefined {
  const number = toNumber(value);
  if (number === undefined) {
    return undefined;
  }
  const low = toNumber(lower);
  const high = toNumber(upper);
  if (
    (low !== undefined && number < low) ||
    (high !== undefined && number > high)
  ) {
    return 'ng';
  }
  return 'ok';
}

/** 填写点检时的一行：点检项目与填写的值 */
export interface CheckRow {
  item: EquipmentApi.CheckItem;
  itemResult?: string;
  measuredValue?: null | number;
  remark?: string;
}

/** 一行的判定结果：数值型按上下限，判定型取填写的值；没有填写时为 undefined */
export function rowResult(row: CheckRow) {
  if (row.item.resultType === 'numeric') {
    return judgeMeasured(
      row.measuredValue,
      row.item.lowerLimit,
      row.item.upperLimit,
    );
  }
  return row.itemResult === 'ok' || row.itemResult === 'ng'
    ? row.itemResult
    : undefined;
}

/** 不合格的项数（提交前预览） */
export function abnormalCount(rows: CheckRow[]) {
  return rows.filter((row) => rowResult(row) === 'ng').length;
}

/** 还没有填写结果的必检项目名称 */
export function missingMandatory(rows: CheckRow[]) {
  return rows
    .filter((row) => row.item.mandatory === 'Y' && rowResult(row) === undefined)
    .map((row) => row.item.itemName);
}

/**
 * 提交点检的参数：只提交填写了结果的项目（非必检项不填记为未检）；
 * 数值型只发测量值，判定型只发结论，说明去掉首尾空白
 */
export function toCheckRecordForm(
  deviceId: string,
  rows: CheckRow[],
  remark?: string,
): EquipmentApi.CheckRecordForm {
  const details: EquipmentApi.CheckRecordDetailForm[] = [];
  for (const row of rows) {
    if (rowResult(row) === undefined) {
      continue;
    }
    const note = row.remark?.trim();
    const detail: EquipmentApi.CheckRecordDetailForm = {
      checkItemId: row.item.checkItemId,
    };
    if (row.item.resultType === 'numeric') {
      detail.measuredValue = Number(row.measuredValue);
    } else {
      detail.itemResult = row.itemResult;
    }
    if (note) {
      detail.remark = note;
    }
    details.push(detail);
  }
  const text = remark?.trim();
  return text ? { details, deviceId, remark: text } : { details, deviceId };
}

/** 状态履历中动作的文案；未知的动作原样显示 */
export function actionLabel(action: string) {
  const key = `mes.equipment.actions.${action}`;
  const label = $t(key);
  return label === key ? action : label;
}

/** 状态变化的文字：“已提交 → 已作废”；新建时只有目标状态；前后相同时只显示一个 */
export function statusChange(
  log: MesApi.StatusLog,
  label: (value: string) => string,
) {
  const to = label(log.toStatus);
  if (!log.fromStatus || log.fromStatus === log.toStatus) {
    return to;
  }
  return `${label(log.fromStatus)} → ${to}`;
}

/**
 * OEE 指标的显示：已计算的显示百分数（去掉多余的 0），其他显示原因（未配置、无数据、无生产）
 *
 * @param statusLabel 状态的文案
 */
export function metricText(
  value: EquipmentApi.Decimal | null | undefined,
  status: string,
  statusLabel: (status: string) => string,
) {
  const number = toNumber(value);
  if (status === METRIC_OK && number !== undefined) {
    return `${number}%`;
  }
  return statusLabel(status) || '-';
}

/** 两个日期（yyyy-MM-dd）之间的天数，含首尾 */
export function daysInRange(begin: string, end: string) {
  const start = Date.parse(`${begin}T00:00:00Z`);
  const finish = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(finish)) {
    return 0;
  }
  return Math.round((finish - start) / 86_400_000) + 1;
}

/** 日期加减天数（yyyy-MM-dd），按日历计算，不受时区影响 */
export function addDays(date: string, days: number) {
  const time = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(time).toISOString().slice(0, 10);
}

/** 默认的 OEE 日期范围：截至今天的最近 days 天 */
export function recentRange(today: string, days = 7): [string, string] {
  return [addDays(today, 1 - days), today];
}
