import type { TraceApi } from '../../api/mes/trace';

import { $t } from '@vben/locales';

import { enumLabel } from './enums';

/** 数量显示：去掉多余的 0；为空时显示 - */
export function qty(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value);
}

/** 需要对应模块查询权限的段，按页面上的顺序 */
export const TRACE_SECTIONS: TraceApi.Section[] = [
  'reports',
  'materials',
  'inspections',
  'defects',
  'stockIns',
];

/** 段的名称 */
export function sectionName(section: TraceApi.Section) {
  return $t(`mes.trace.sections.${section}`);
}

/** 没有权限的段的名称，按页面上的顺序连接成一句；全部有权限时为空串 */
export function deniedSectionsText(denied?: TraceApi.Section[]) {
  const set = new Set(denied);
  return TRACE_SECTIONS.filter((section) => set.has(section))
    .map((section) => sectionName(section))
    .join($t('mes.trace.sectionSeparator'));
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

/** 时间线的圆点颜色：语义色名（与 Ant Design Timeline 的预设色同名），Element Plus 版映射为节点类型 */
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
