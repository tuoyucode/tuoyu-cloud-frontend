import { describe, expect, it } from 'vitest';

import {
  approvalDrawerData,
  hasApproval,
  isApproving,
  resultMessageKey,
} from '../approval';

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
