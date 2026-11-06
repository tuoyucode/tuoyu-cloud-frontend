import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendIds,
  fromMessageBox,
  isBoxMessage,
  loadMessageState,
  mergeMessages,
  parsePushData,
  parseTime,
  resolveCategory,
  saveMessageState,
} from '../message-box';

describe('消息分类', () => {
  it('与后端一致：notice 类型或来源为通知公告，workflow 来源为工作流，其余为系统消息', () => {
    expect(resolveCategory('notice', 'notice')).toBe('notice');
    expect(resolveCategory('message', 'notice')).toBe('notice');
    expect(resolveCategory('notice', 'backend')).toBe('notice');
    expect(resolveCategory('message', 'workflow')).toBe('workflow');
    expect(resolveCategory('message', 'backend')).toBe('system');
    expect(resolveCategory(undefined, undefined)).toBe('system');
  });

  it('只有 message、notice 类型进入消息中心，大模型输出不进入', () => {
    expect(isBoxMessage('message', 'backend')).toBe(true);
    expect(isBoxMessage('notice', 'notice')).toBe(true);
    expect(isBoxMessage('message', 'llm')).toBe(false);
    expect(isBoxMessage('llm', 'llm')).toBe(false);
    expect(isBoxMessage('custom', 'backend')).toBe(false);
  });
});

describe('parseTime', () => {
  it('后端的本地时间字符串、毫秒时间戳与无效值', () => {
    expect(parseTime('2026-11-01 08:30:05')).toBe(
      new Date(2026, 10, 1, 8, 30, 5).getTime(),
    );
    expect(parseTime(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(parseTime('')).toBe(0);
    expect(parseTime('not a time')).toBe(0);
    expect(parseTime(null)).toBe(0);
  });
});

describe('parsePushData', () => {
  it('通知公告推送：正文取自 data.noticeContent，路径保留查询参数', () => {
    const result = parsePushData(
      JSON.stringify({
        data: { noticeContent: '第一行\n第二行', noticeTitle: '标题' },
        message: '[通知] 标题',
        messageId: '1985000000000000001',
        path: '/system/notice?noticeId=9',
        source: 'notice',
        timestamp: 1_700_000_000_000,
        type: 'notice',
      }),
    );
    expect(result).toEqual({
      item: {
        category: 'notice',
        content: '第一行\n第二行',
        id: '1985000000000000001',
        message: '[通知] 标题',
        path: '/system/notice?noticeId=9',
        time: 1_700_000_000_000,
      },
      kind: 'message',
    });
  });

  it('工作流消息带页面路径；数字 ID 转为字符串', () => {
    const result = parsePushData(
      JSON.stringify({
        message: '有新的待办',
        messageId: 12,
        path: '/task/taskWaiting',
        source: 'workflow',
        timestamp: 5,
        type: 'message',
      }),
    );
    expect(result).toEqual({
      item: {
        category: 'workflow',
        content: undefined,
        id: '12',
        message: '有新的待办',
        path: '/task/taskWaiting',
        time: 5,
      },
      kind: 'message',
    });
  });

  it('没有入库的推送（没有 messageId）生成稳定的本地 ID，缺少时间时用当前时间', () => {
    const data = JSON.stringify({
      message: '欢迎',
      source: 'backend',
      type: 'message',
    });
    const first = parsePushData(data, 1000);
    const second = parsePushData(data, 1000);
    expect(first).toMatchObject({ item: { id: 'local-1000-欢迎' } });
    expect(second).toEqual(first);
  });

  it('kicked 控制消息、大模型输出、空消息与非 JSON 内容', () => {
    expect(parsePushData('kicked')).toEqual({ kind: 'kicked' });
    expect(
      parsePushData(
        JSON.stringify({ message: '片段', source: 'llm', type: 'llm' }),
      ),
    ).toEqual({ kind: 'ignored' });
    expect(
      parsePushData(JSON.stringify({ message: '', type: 'message' })),
    ).toEqual({ kind: 'ignored' });
    expect(parsePushData('not json')).toEqual({ kind: 'ignored' });
    expect(parsePushData('[1,2]')).toEqual({ kind: 'ignored' });
    expect(parsePushData('null')).toEqual({ kind: 'ignored' });
  });
});

describe('fromMessageBox', () => {
  it('合并三类历史消息，分类以后端为准，正文优先取 content', () => {
    const items = fromMessageBox({
      noticeList: [
        {
          category: 'notice',
          content: '正文',
          createTime: '2026-11-01 10:00:00',
          message: '[通知] 标题',
          messageId: 2,
          path: '/system/notice?noticeId=1',
          source: 'notice',
          type: 'notice',
        },
      ],
      systemList: [
        {
          category: 'system',
          content: null,
          createTime: '2026-11-01 09:00:00',
          message: '欢迎登录',
          messageId: '1',
          path: null,
          source: 'backend',
          type: 'message',
        },
      ],
      workflowList: [
        {
          // 分类缺失时按类型与来源推断
          createTime: '2026-11-01 11:00:00',
          message: '有新的待办',
          messageId: '3',
          path: '/task/taskWaiting',
          source: 'workflow',
          type: 'message',
        },
      ],
    });
    expect(items.map((item) => [item.id, item.category])).toEqual([
      ['1', 'system'],
      ['2', 'notice'],
      ['3', 'workflow'],
    ]);
    expect(items[0]?.path).toBeUndefined();
    expect(items[1]?.content).toBe('正文');
    expect(items[2]?.time).toBe(new Date(2026, 10, 1, 11).getTime());
  });

  it('空盒子与缺少 ID 的记录', () => {
    expect(fromMessageBox(null)).toEqual([]);
    expect(fromMessageBox({})).toEqual([]);
    expect(
      fromMessageBox({
        systemList: [{ message: 'x', messageId: '' }],
      }),
    ).toEqual([]);
  });
});

describe('mergeMessages', () => {
  const item = (id: string, time: number, message = id) => ({
    category: 'system' as const,
    id,
    message,
    time,
  });

  it('按 ID 去重（新来的覆盖旧的），按时间倒序', () => {
    const merged = mergeMessages(
      [item('a', 1), item('b', 3)],
      [item('a', 1, '更新'), item('c', 2)],
    );
    expect(merged.map((m) => m.id)).toEqual(['b', 'c', 'a']);
    expect(merged[2]?.message).toBe('更新');
  });

  it('超过上限时只保留最新的', () => {
    const merged = mergeMessages(
      [item('a', 1), item('b', 2)],
      [item('c', 3)],
      2,
    );
    expect(merged.map((m) => m.id)).toEqual(['c', 'b']);
  });

  it('时间相同时顺序稳定', () => {
    const merged = mergeMessages([item('a', 1)], [item('b', 1)]);
    expect(merged.map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('本地消息状态', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('按用户分别保存与读取', () => {
    saveMessageState('1', { hidden: ['x'], read: ['a', 'b'] });
    expect(loadMessageState('1')).toEqual({ hidden: ['x'], read: ['a', 'b'] });
    expect(loadMessageState('2')).toEqual({ hidden: [], read: [] });
  });

  it('数据损坏或浏览器禁止存储时返回空状态，不抛出异常', () => {
    window.localStorage.setItem('tuoyu-message-state:1', '{bad');
    expect(loadMessageState('1')).toEqual({ hidden: [], read: [] });
    window.localStorage.setItem(
      'tuoyu-message-state:1',
      JSON.stringify({ hidden: 'x', read: ['a', 1] }),
    );
    expect(loadMessageState('1')).toEqual({ hidden: [], read: ['a'] });

    // 浏览器禁止存储时访问 localStorage 本身就会抛出异常
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadMessageState('1')).toEqual({ hidden: [], read: [] });
    expect(() => saveMessageState('1', { hidden: [], read: [] })).not.toThrow();
  });

  it('appendIds 去重并只保留最近的若干个', () => {
    expect(appendIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(appendIds(['a', 'b', 'c'], ['a'], 2)).toEqual(['c', 'a']);
  });
});
