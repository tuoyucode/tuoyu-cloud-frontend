import { describe, expect, it } from 'vitest';

import { resolveBusinessForm } from '../business-form';

describe('resolveBusinessForm', () => {
  it('表单路径指向 views 下已有的页面时返回组件，同一路径返回同一个组件', () => {
    const component = resolveBusinessForm('workflow/task/taskWaiting');

    expect(component).toBeTruthy();
    expect(resolveBusinessForm('/workflow/task/taskWaiting.vue')).toBe(
      component,
    );
    expect(resolveBusinessForm('system/post/index')).toBeTruthy();
  });

  it('页面不存在时返回 null，由抽屉提示检查表单路径', () => {
    expect(resolveBusinessForm('workflow/not-exist/detail')).toBeNull();
  });

  it('没有表单路径或路径不合法时返回 undefined，不显示业务详情', () => {
    expect(resolveBusinessForm()).toBeUndefined();
    expect(resolveBusinessForm('')).toBeUndefined();
    expect(resolveBusinessForm('../../main')).toBeUndefined();
  });
});
