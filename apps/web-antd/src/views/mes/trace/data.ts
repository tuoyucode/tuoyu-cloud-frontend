import type { TraceApi } from '@tuoyu/shared/api/mes/trace';

import { $t } from '#/locales';

import { enumLabel } from '../_shared/enums';

/** 数量显示：去掉多余的 0；为空时显示 - */
export function qty(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value);
}

/** antd Table 的列（文案在调用时取，切换语言后重新生成） */
export function taskColumns() {
  return [
    {
      dataIndex: 'seqNo',
      key: 'seqNo',
      title: $t('mes.trace.seqNo'),
      width: 70,
    },
    {
      dataIndex: 'operationName',
      key: 'operationName',
      title: $t('mes.trace.operation'),
    },
    { dataIndex: 'taskStatus', key: 'taskStatus', title: $t('crud.status') },
    { dataIndex: 'planQty', key: 'planQty', title: $t('mes.trace.planQty') },
    {
      dataIndex: 'qualifiedQty',
      key: 'qualifiedQty',
      title: $t('mes.trace.qualifiedQty'),
    },
    {
      dataIndex: 'defectQty',
      key: 'defectQty',
      title: $t('mes.trace.defectQty'),
    },
    {
      dataIndex: 'actualStartTime',
      key: 'actualStartTime',
      title: $t('mes.trace.actualStartTime'),
    },
    {
      dataIndex: 'actualEndTime',
      key: 'actualEndTime',
      title: $t('mes.trace.actualEndTime'),
    },
  ];
}

export function reportColumns() {
  return [
    {
      dataIndex: 'reportCode',
      key: 'reportCode',
      title: $t('mes.trace.reportCode'),
    },
    {
      dataIndex: 'reportUserName',
      key: 'reportUserName',
      title: $t('mes.trace.reportUser'),
    },
    {
      dataIndex: 'reportTime',
      key: 'reportTime',
      title: $t('mes.trace.reportTime'),
    },
    {
      dataIndex: 'qualifiedQty',
      key: 'qualifiedQty',
      title: $t('mes.trace.qualifiedQty'),
    },
    {
      dataIndex: 'defectQty',
      key: 'defectQty',
      title: $t('mes.trace.defectQty'),
    },
    {
      dataIndex: 'stationName',
      key: 'stationName',
      title: $t('mes.trace.station'),
    },
    { dataIndex: 'teamName', key: 'teamName', title: $t('mes.trace.team') },
    {
      dataIndex: 'reportStatus',
      key: 'reportStatus',
      title: $t('crud.status'),
    },
  ];
}

export function materialColumns() {
  return [
    {
      dataIndex: 'requestCode',
      key: 'requestCode',
      title: $t('mes.trace.requestCode'),
    },
    {
      dataIndex: 'requestType',
      key: 'requestType',
      title: $t('mes.trace.requestType'),
    },
    {
      dataIndex: 'materialCode',
      key: 'materialCode',
      title: $t('mes.trace.materialCode'),
    },
    {
      dataIndex: 'materialName',
      key: 'materialName',
      title: $t('mes.trace.materialName'),
    },
    {
      dataIndex: 'batchCode',
      key: 'batchCode',
      title: $t('mes.trace.materialBatch'),
    },
    {
      dataIndex: 'actualQty',
      key: 'actualQty',
      title: $t('mes.trace.actualQty'),
    },
    {
      dataIndex: 'locationName',
      key: 'locationName',
      title: $t('mes.trace.location'),
    },
    {
      dataIndex: 'completeTime',
      key: 'completeTime',
      title: $t('mes.trace.completeTime'),
    },
  ];
}

export function inspectionColumns() {
  return [
    {
      dataIndex: 'inspectionCode',
      key: 'inspectionCode',
      title: $t('mes.trace.inspectionCode'),
    },
    {
      dataIndex: 'inspectionType',
      key: 'inspectionType',
      title: $t('mes.trace.inspectionType'),
    },
    {
      dataIndex: 'operationName',
      key: 'operationName',
      title: $t('mes.trace.operation'),
    },
    {
      dataIndex: 'inspectionResult',
      key: 'inspectionResult',
      title: $t('mes.trace.inspectionResult'),
    },
    {
      dataIndex: 'inspectQty',
      key: 'inspectQty',
      title: $t('mes.trace.inspectQty'),
    },
    {
      dataIndex: 'defectQty',
      key: 'defectQty',
      title: $t('mes.trace.defectQty'),
    },
    {
      dataIndex: 'inspectorName',
      key: 'inspectorName',
      title: $t('mes.trace.inspector'),
    },
    {
      dataIndex: 'inspectionTime',
      key: 'inspectionTime',
      title: $t('mes.trace.inspectionTime'),
    },
  ];
}

export function defectColumns() {
  return [
    {
      dataIndex: 'defectCode',
      key: 'defectCode',
      title: $t('mes.trace.defectCode'),
    },
    {
      dataIndex: 'sourceType',
      key: 'sourceType',
      title: $t('mes.trace.defectSource'),
    },
    {
      dataIndex: 'operationName',
      key: 'operationName',
      title: $t('mes.trace.operation'),
    },
    {
      dataIndex: 'defectLevel',
      key: 'defectLevel',
      title: $t('mes.trace.defectLevel'),
    },
    {
      dataIndex: 'defectQty',
      key: 'defectQty',
      title: $t('mes.trace.defectQty'),
    },
    {
      dataIndex: 'description',
      key: 'description',
      title: $t('mes.trace.defectDescription'),
    },
    {
      dataIndex: 'handleStatus',
      key: 'handleStatus',
      title: $t('mes.trace.handleStatus'),
    },
    {
      dataIndex: 'handleUserName',
      key: 'handleUserName',
      title: $t('mes.trace.handleUser'),
    },
  ];
}

export function stockInColumns() {
  return [
    {
      dataIndex: 'stockInCode',
      key: 'stockInCode',
      title: $t('mes.trace.stockInCode'),
    },
    { dataIndex: 'qty', key: 'qty', title: $t('mes.trace.stockInQty') },
    {
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      title: $t('mes.trace.warehouse'),
    },
    {
      dataIndex: 'locationName',
      key: 'locationName',
      title: $t('mes.trace.location'),
    },
    {
      dataIndex: 'stockInStatus',
      key: 'stockInStatus',
      title: $t('crud.status'),
    },
    {
      dataIndex: 'completeTime',
      key: 'completeTime',
      title: $t('mes.trace.completeTime'),
    },
  ];
}

/** 报工记录展开成一张表：带上工序名称 */
export function flattenReports(workorder: TraceApi.Workorder) {
  return workorder.tasks.flatMap((task) =>
    task.reports.map((report) => ({
      ...report,
      operationName: `${task.seqNo} ${task.operationName}`,
    })),
  );
}

function actionText(action: string) {
  const key = `mes.trace.actions.${action}`;
  const label = $t(key);
  return label === key ? action : label;
}

/** 时间线中一个事件的说明文字 */
export function eventText(event: TraceApi.Event) {
  const code = event.bizCode ?? '';
  switch (event.category) {
    case 'defect_record': {
      return event.action === 'handle'
        ? $t('mes.trace.events.defectHandled', {
            code,
            method: enumLabel('DefectHandleMethod', event.toStatus),
          })
        : $t('mes.trace.events.defectCreated', { code, qty: qty(event.qty) });
    }
    case 'inspection': {
      return $t('mes.trace.events.inspection', {
        code,
        result: enumLabel('InspectionResult', event.toStatus),
        type: enumLabel('InspectionType', event.remark),
      });
    }
    case 'material_request': {
      return $t('mes.trace.events.material', {
        code,
        type: enumLabel('MaterialRequestType', event.action),
      });
    }
    case 'production_report': {
      return $t('mes.trace.events.report', {
        code,
        defect: qty(event.defectQty),
        operation: event.remark ?? '',
        qualified: qty(event.qty),
      });
    }
    case 'sn': {
      return $t('mes.trace.events.sn', {
        action: actionText(event.action),
        status: enumLabel('SnStatus', event.toStatus),
      });
    }
    case 'stock_in': {
      return $t('mes.trace.events.stockIn', { code, qty: qty(event.qty) });
    }
    case 'workorder': {
      return $t('mes.trace.events.workorder', {
        action: actionText(event.action),
        status: enumLabel('WorkorderStatus', event.toStatus),
      });
    }
    default: {
      return `${enumLabel('BizType', event.category)} ${code}`;
    }
  }
}

/** 时间线的圆点颜色 */
export function eventColor(event: TraceApi.Event) {
  if (event.category === 'defect_record' || event.toStatus === 'rejected') {
    return 'red';
  }
  if (event.category === 'stock_in' || event.toStatus === 'completed') {
    return 'green';
  }
  if (event.toStatus === 'cancelled' || event.toStatus === 'scrapped') {
    return 'gray';
  }
  return 'blue';
}
