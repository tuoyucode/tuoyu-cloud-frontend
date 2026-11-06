import { describe, expect, it } from 'vitest';

import { nestNamespaces } from '../locale';

describe('nestNamespaces', () => {
  it('子目录中的文案按目录嵌套，并与同名文件合并', () => {
    const messages = nestNamespaces({
      crud: { saved: '已保存' },
      'monitor/online': { title: '在线用户' },
      'system/post': { title: '岗位' },
      system: { shared: '共用' },
    });

    expect(messages.crud.saved).toBe('已保存');
    expect(messages.system.post.title).toBe('岗位');
    expect(messages.system.shared).toBe('共用');
    expect(messages.monitor.online.title).toBe('在线用户');
  });
});
