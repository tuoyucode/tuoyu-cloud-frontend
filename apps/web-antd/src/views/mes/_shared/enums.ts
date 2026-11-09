/**
 * MES 的状态与类型（与后端 org.tuoyu.mes.*.enums 一一对应，值不能改）。
 * 文案在 locales/langs/<语言>/mes/enums.json，颜色为 Ant Design Tag 的预设色。
 */
import { $t } from '#/locales';

export interface MesEnumItem {
  color: string;
  value: string;
}

export const MES_ENUMS = {
  MaterialType: [
    { color: 'default', value: 'product' },
    { color: 'default', value: 'semi' },
    { color: 'default', value: 'raw' },
    { color: 'default', value: 'aux' },
  ],
  TraceMode: [
    { color: 'default', value: 'none' },
    { color: 'default', value: 'batch' },
    { color: 'default', value: 'sn' },
  ],
  WarehouseType: [
    { color: 'default', value: 'raw' },
    { color: 'default', value: 'wip' },
    { color: 'default', value: 'finished' },
  ],
  WorkorderStatus: [
    { color: 'default', value: 'draft' },
    { color: 'processing', value: 'released' },
    { color: 'blue', value: 'in_progress' },
    { color: 'warning', value: 'paused' },
    { color: 'success', value: 'completed' },
    { color: 'default', value: 'closed' },
    { color: 'default', value: 'cancelled' },
  ],
  WorkorderSource: [
    { color: 'default', value: 'manual' },
    { color: 'default', value: 'erp' },
  ],
  TaskStatus: [
    { color: 'warning', value: 'pending' },
    { color: 'processing', value: 'dispatched' },
    { color: 'blue', value: 'in_progress' },
    { color: 'success', value: 'completed' },
    { color: 'default', value: 'closed' },
  ],
  ReportStatus: [
    { color: 'processing', value: 'reported' },
    { color: 'success', value: 'confirmed' },
    { color: 'default', value: 'cancelled' },
  ],
  MaterialRequestType: [
    { color: 'default', value: 'issue' },
    { color: 'default', value: 'supplement' },
    { color: 'default', value: 'return' },
  ],
  MaterialRequestStatus: [
    { color: 'default', value: 'draft' },
    { color: 'processing', value: 'submitted' },
    { color: 'success', value: 'completed' },
    { color: 'default', value: 'cancelled' },
  ],
  StockInStatus: [
    { color: 'processing', value: 'submitted' },
    { color: 'success', value: 'completed' },
    { color: 'default', value: 'cancelled' },
  ],
  InspectionType: [
    { color: 'default', value: 'first' },
    { color: 'default', value: 'patrol' },
    { color: 'default', value: 'final' },
  ],
  InspectionStatus: [
    { color: 'warning', value: 'pending' },
    { color: 'success', value: 'completed' },
  ],
  InspectionResult: [
    { color: 'success', value: 'passed' },
    { color: 'error', value: 'rejected' },
  ],
  DefectSource: [
    { color: 'default', value: 'report' },
    { color: 'default', value: 'inspection' },
    { color: 'default', value: 'manual' },
  ],
  DefectLevel: [
    { color: 'default', value: 'minor' },
    { color: 'warning', value: 'major' },
    { color: 'error', value: 'critical' },
  ],
  DefectHandleMethod: [
    { color: 'default', value: 'rework' },
    { color: 'default', value: 'scrap' },
    { color: 'default', value: 'concession' },
  ],
  DefectHandleStatus: [
    { color: 'warning', value: 'pending' },
    { color: 'success', value: 'handled' },
  ],
  ResetCycle: [
    { color: 'default', value: 'none' },
    { color: 'default', value: 'day' },
    { color: 'default', value: 'month' },
    { color: 'default', value: 'year' },
  ],
  SnStatus: [
    { color: 'default', value: 'created' },
    { color: 'success', value: 'completed' },
    { color: 'error', value: 'scrapped' },
  ],
  AndonType: [
    { color: 'default', value: 'equipment' },
    { color: 'default', value: 'quality' },
    { color: 'default', value: 'material' },
    { color: 'default', value: 'process' },
    { color: 'default', value: 'other' },
  ],
  AndonLevel: [
    { color: 'default', value: 'normal' },
    { color: 'warning', value: 'urgent' },
    { color: 'error', value: 'critical' },
  ],
  AndonStatus: [
    { color: 'processing', value: 'reported' },
    { color: 'processing', value: 'assigned' },
    { color: 'blue', value: 'processing' },
    { color: 'success', value: 'resolved' },
    { color: 'default', value: 'closed' },
  ],
  DowntimeReasonType: [
    { color: 'default', value: 'equipment' },
    { color: 'default', value: 'material' },
    { color: 'default', value: 'quality' },
    { color: 'default', value: 'personnel' },
    { color: 'default', value: 'other' },
  ],
  BizType: [
    { color: 'default', value: 'workorder' },
    { color: 'default', value: 'operation_task' },
    { color: 'default', value: 'production_report' },
    { color: 'default', value: 'material_request' },
    { color: 'default', value: 'stock_in' },
    { color: 'default', value: 'inspection' },
    { color: 'default', value: 'defect_record' },
    { color: 'default', value: 'andon_event' },
    { color: 'default', value: 'sn' },
  ],
} satisfies Record<string, MesEnumItem[]>;

export type MesEnumType = keyof typeof MES_ENUMS;

/** 下拉选项 */
export function enumOptions(type: MesEnumType) {
  return MES_ENUMS[type].map((item) => ({
    label: enumLabel(type, item.value),
    value: item.value,
  }));
}

/** 文案；未知的值原样显示 */
export function enumLabel(type: MesEnumType, value?: null | string) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const key = `mes.enums.${type}.${value}`;
  const label = $t(key);
  return label === key ? value : label;
}

/** 标签颜色 */
export function enumColor(type: MesEnumType, value?: null | string) {
  return (
    (MES_ENUMS[type] as MesEnumItem[]).find((item) => item.value === value)
      ?.color ?? 'default'
  );
}
