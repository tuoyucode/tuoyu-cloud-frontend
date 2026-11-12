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

  it('多份文案按顺序合并，同一文件中后面的同名键优先，其余键保留', () => {
    const messages = nestNamespaces(
      {
        crud: { deleted: '已删除', saved: '已保存' },
        'system/post': { title: '岗位' },
      },
      {
        crud: { saved: '保存成功' },
        'mes/workorder': { title: '工单' },
      },
    );

    expect(messages.crud.saved).toBe('保存成功');
    expect(messages.crud.deleted).toBe('已删除');
    expect(messages.system.post.title).toBe('岗位');
    expect(messages.mes.workorder.title).toBe('工单');
  });
});
