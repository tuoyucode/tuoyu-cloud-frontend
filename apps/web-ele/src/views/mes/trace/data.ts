import { $t } from '#/locales';

export {
  deniedSectionsText,
  eventColor,
  eventText,
  flattenReports,
  qty,
  sectionName,
  TRACE_SECTIONS,
} from '@tuoyu/shared/pages/mes/trace';

/** ElTable 的一列：key 用于在单元格插槽中区分列，prop 为字段名 */
export interface TraceColumn {
  key: string;
  label: string;
  prop: string;
  width?: number;
}

/** ElTable 的列（文案在调用时取，切换语言后重新生成） */
export function taskColumns(): TraceColumn[] {
  return [
    { key: 'seqNo', label: $t('mes.trace.seqNo'), prop: 'seqNo', width: 70 },
    {
      key: 'operationName',
      label: $t('mes.trace.operation'),
      prop: 'operationName',
    },
    { key: 'taskStatus', label: $t('crud.status'), prop: 'taskStatus' },
    { key: 'planQty', label: $t('mes.trace.planQty'), prop: 'planQty' },
    {
      key: 'qualifiedQty',
      label: $t('mes.trace.qualifiedQty'),
      prop: 'qualifiedQty',
    },
    { key: 'defectQty', label: $t('mes.trace.defectQty'), prop: 'defectQty' },
    {
      key: 'actualStartTime',
      label: $t('mes.trace.actualStartTime'),
      prop: 'actualStartTime',
    },
    {
      key: 'actualEndTime',
      label: $t('mes.trace.actualEndTime'),
      prop: 'actualEndTime',
    },
  ];
}

export function reportColumns(): TraceColumn[] {
  return [
    {
      key: 'reportCode',
      label: $t('mes.trace.reportCode'),
      prop: 'reportCode',
    },
    {
      key: 'reportUserName',
      label: $t('mes.trace.reportUser'),
      prop: 'reportUserName',
    },
    {
      key: 'reportTime',
      label: $t('mes.trace.reportTime'),
      prop: 'reportTime',
    },
    {
      key: 'qualifiedQty',
      label: $t('mes.trace.qualifiedQty'),
      prop: 'qualifiedQty',
    },
    { key: 'defectQty', label: $t('mes.trace.defectQty'), prop: 'defectQty' },
    { key: 'stationName', label: $t('mes.trace.station'), prop: 'stationName' },
    { key: 'teamName', label: $t('mes.trace.team'), prop: 'teamName' },
    { key: 'reportStatus', label: $t('crud.status'), prop: 'reportStatus' },
  ];
}

export function materialColumns(): TraceColumn[] {
  return [
    {
      key: 'requestCode',
      label: $t('mes.trace.requestCode'),
      prop: 'requestCode',
    },
    {
      key: 'requestType',
      label: $t('mes.trace.requestType'),
      prop: 'requestType',
    },
    {
      key: 'materialCode',
      label: $t('mes.trace.materialCode'),
      prop: 'materialCode',
    },
    {
      key: 'materialName',
      label: $t('mes.trace.materialName'),
      prop: 'materialName',
    },
    {
      key: 'batchCode',
      label: $t('mes.trace.materialBatch'),
      prop: 'batchCode',
    },
    { key: 'actualQty', label: $t('mes.trace.actualQty'), prop: 'actualQty' },
    {
      key: 'locationName',
      label: $t('mes.trace.location'),
      prop: 'locationName',
    },
    {
      key: 'completeTime',
      label: $t('mes.trace.completeTime'),
      prop: 'completeTime',
    },
  ];
}

export function inspectionColumns(): TraceColumn[] {
  return [
    {
      key: 'inspectionCode',
      label: $t('mes.trace.inspectionCode'),
      prop: 'inspectionCode',
    },
    {
      key: 'inspectionType',
      label: $t('mes.trace.inspectionType'),
      prop: 'inspectionType',
    },
    {
      key: 'operationName',
      label: $t('mes.trace.operation'),
      prop: 'operationName',
    },
    {
      key: 'inspectionResult',
      label: $t('mes.trace.inspectionResult'),
      prop: 'inspectionResult',
    },
    {
      key: 'inspectQty',
      label: $t('mes.trace.inspectQty'),
      prop: 'inspectQty',
    },
    { key: 'defectQty', label: $t('mes.trace.defectQty'), prop: 'defectQty' },
    {
      key: 'inspectorName',
      label: $t('mes.trace.inspector'),
      prop: 'inspectorName',
    },
    {
      key: 'inspectionTime',
      label: $t('mes.trace.inspectionTime'),
      prop: 'inspectionTime',
    },
  ];
}

export function defectColumns(): TraceColumn[] {
  return [
    {
      key: 'defectCode',
      label: $t('mes.trace.defectCode'),
      prop: 'defectCode',
    },
    {
      key: 'sourceType',
      label: $t('mes.trace.defectSource'),
      prop: 'sourceType',
    },
    {
      key: 'operationName',
      label: $t('mes.trace.operation'),
      prop: 'operationName',
    },
    {
      key: 'defectLevel',
      label: $t('mes.trace.defectLevel'),
      prop: 'defectLevel',
    },
    { key: 'defectQty', label: $t('mes.trace.defectQty'), prop: 'defectQty' },
    {
      key: 'description',
      label: $t('mes.trace.defectDescription'),
      prop: 'description',
    },
    {
      key: 'handleStatus',
      label: $t('mes.trace.handleStatus'),
      prop: 'handleStatus',
    },
    {
      key: 'handleUserName',
      label: $t('mes.trace.handleUser'),
      prop: 'handleUserName',
    },
  ];
}

export function stockInColumns(): TraceColumn[] {
  return [
    {
      key: 'stockInCode',
      label: $t('mes.trace.stockInCode'),
      prop: 'stockInCode',
    },
    { key: 'qty', label: $t('mes.trace.stockInQty'), prop: 'qty' },
    {
      key: 'warehouseName',
      label: $t('mes.trace.warehouse'),
      prop: 'warehouseName',
    },
    {
      key: 'locationName',
      label: $t('mes.trace.location'),
      prop: 'locationName',
    },
    { key: 'stockInStatus', label: $t('crud.status'), prop: 'stockInStatus' },
    {
      key: 'completeTime',
      label: $t('mes.trace.completeTime'),
      prop: 'completeTime',
    },
  ];
}
