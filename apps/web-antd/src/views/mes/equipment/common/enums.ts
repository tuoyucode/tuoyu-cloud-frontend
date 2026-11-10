/**
 * 设备管理的状态与类型（与后端 org.tuoyu.mes.equipment.enums 一一对应，值不能改）。
 * 文案在 locales/langs/<语言>/mes/equipment.json 的 enums 下，颜色为 Ant Design Tag 的预设色。
 */
import { $t } from '#/locales';

export interface EquipmentEnumItem {
  color: string;
  value: string;
}

export const EQUIPMENT_ENUMS = {
  CheckResultType: [
    { color: 'default', value: 'judge' },
    { color: 'default', value: 'numeric' },
  ],
  CheckItemResult: [
    { color: 'success', value: 'ok' },
    { color: 'error', value: 'ng' },
  ],
  CheckResult: [
    { color: 'success', value: 'normal' },
    { color: 'error', value: 'abnormal' },
  ],
  CheckRecordStatus: [
    { color: 'processing', value: 'completed' },
    { color: 'default', value: 'voided' },
  ],
  MaintenanceOrderStatus: [
    { color: 'warning', value: 'pending' },
    { color: 'blue', value: 'in_progress' },
    { color: 'success', value: 'completed' },
    { color: 'default', value: 'cancelled' },
  ],
  OeeMetricStatus: [
    { color: 'success', value: 'ok' },
    { color: 'warning', value: 'unconfigured' },
    { color: 'default', value: 'no_data' },
    { color: 'default', value: 'idle' },
  ],
} satisfies Record<string, EquipmentEnumItem[]>;

export type EquipmentEnumType = keyof typeof EQUIPMENT_ENUMS;

/** 文案；未知的值原样显示 */
export function equipmentEnumLabel(
  type: EquipmentEnumType,
  value?: null | string,
) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const key = `mes.equipment.enums.${type}.${value}`;
  const label = $t(key);
  return label === key ? value : label;
}

/** 下拉选项 */
export function equipmentEnumOptions(type: EquipmentEnumType) {
  return EQUIPMENT_ENUMS[type].map((item) => ({
    label: equipmentEnumLabel(type, item.value),
    value: item.value,
  }));
}

/** 标签颜色 */
export function equipmentEnumColor(
  type: EquipmentEnumType,
  value?: null | string,
) {
  return (
    (EQUIPMENT_ENUMS[type] as EquipmentEnumItem[]).find(
      (item) => item.value === value,
    )?.color ?? 'default'
  );
}
