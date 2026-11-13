import { describe, expect, it } from 'vitest';

import {
  approvalDrawerData,
  batchRequired,
  firstMissingBatch,
  hasApproval,
  isApproving,
  resultMessageKey,
} from '../material-request';
describe('单据审批', () => {
  it('按状态判断是否在审批中', () => {
    expect(isApproving('approving')).toBe(true);
    expect(isApproving('pending')).toBe(false);
    expect(isApproving(undefined)).toBe(false);
    expect(isApproving(null)).toBe(false);
  });

  it('有业务 ID 时才有审批记录', () => {
    expect(hasApproval({ approvalBusinessId: '500-2' })).toBe(true);
    expect(hasApproval({ approvalBusinessId: '' })).toBe(false);
    expect(hasApproval({})).toBe(false);
  });

  it('查看审批的抽屉参数只读，带单据编号', () => {
    expect(approvalDrawerData('500', 'NG001')).toEqual({
      businessId: '500',
      summary: { businessCode: 'NG001' },
    });
  });

  it('已提交审批与直接完成的提示不同', () => {
    expect(resultMessageKey('approving', 'a', 'b')).toBe('a');
    expect(resultMessageKey('handled', 'a', 'b')).toBe('b');
    expect(resultMessageKey(undefined, 'a', 'b')).toBe('b');
  });
});

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
