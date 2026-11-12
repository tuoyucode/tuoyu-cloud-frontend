import { describe, expect, it } from 'vitest';

import { batchRequired, firstMissingBatch } from '../complete';

describe('完成领退料：按批次追溯的物料必须填写批次号', () => {
  it('按批次追溯且实发数量大于 0 时必填', () => {
    expect(batchRequired({ actualQty: 2, traceMode: 'batch' })).toBe(true);
    expect(batchRequired({ actualQty: 0, traceMode: 'batch' })).toBe(false);
    expect(batchRequired({ actualQty: null, traceMode: 'batch' })).toBe(false);
    expect(batchRequired({ actualQty: 2, traceMode: 'none' })).toBe(false);
    expect(batchRequired({ actualQty: 2, traceMode: 'sn' })).toBe(false);
    expect(batchRequired({ actualQty: 2 })).toBe(false);
  });

  it('找出第一个缺少批次号的行，只有空白的批次号视为未填写', () => {
    expect(
      firstMissingBatch([
        { actualQty: 1, traceMode: 'none' },
        { actualQty: 1, batchCode: 'LOT-1', traceMode: 'batch' },
        { actualQty: 1, batchCode: '  ', traceMode: 'batch' },
        { actualQty: 1, traceMode: 'batch' },
      ]),
    ).toBe(2);
    expect(
      firstMissingBatch([
        { actualQty: 0, traceMode: 'batch' },
        { actualQty: 1, batchCode: 'LOT-1', traceMode: 'batch' },
      ]),
    ).toBe(-1);
  });
});
