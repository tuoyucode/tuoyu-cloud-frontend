/** 完成领退料时一行的批次相关字段 */
export interface BatchRow {
  actualQty?: null | number;
  batchCode?: string;
  /** 物料的追溯方式：none、batch、sn */
  traceMode?: string;
}

/**
 * 按批次追溯（batch）、实发（实退）数量大于 0 的行必须填写物料批次号，与服务端的校验一致
 */
export function batchRequired(row: BatchRow) {
  return row.traceMode === 'batch' && Number(row.actualQty ?? 0) > 0;
}

/**
 * 第一个必须填写却没有填写物料批次号的行的下标，没有时为 -1
 */
export function firstMissingBatch(rows: BatchRow[]) {
  return rows.findIndex((row) => batchRequired(row) && !row.batchCode?.trim());
}
