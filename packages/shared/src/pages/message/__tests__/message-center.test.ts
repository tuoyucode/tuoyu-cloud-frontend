import type { MessageItem } from '../../../utils/message-box';
import type { MessageCenter, MessageCenterSnapshot } from '../message-center';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  canOpenMessagePath,
  createMessageCenter,
  EMPTY_MESSAGE_SNAPSHOT,
  filterMessages,
  messageFilterOptions,
  toMessageSnapshot,
} from '../message-center';

const api = vi.hoisted(() => ({
  closeMessageStream: vi.fn(),
  getMessageBox: vi.fn(),
}));

vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('../../../api/request', () => ({
  CLIENT_ID: 'test-client',
  contentLanguage: () => 'zh_CN',
  formatToken: (token: null | string) => (token ? `Bearer ${token}` : null),
}));
vi.mock('../../../api/core/message', () => ({
  closeMessageStream: api.closeMessageStream,
  getMessageBox: api.getMessageBox,
  messageStreamUrl: () => '/api/resource/message',
}));

function item(
  id: string,
  category: MessageItem['category'] = 'system',
  time = 1000,
): MessageItem {
  return { category, id, message: `消息 ${id}`, time };
}

/** 推送的时间晚于历史消息（2026-11-01） */
const PUSH_TIME = new Date(2026, 10, 2).getTime();

/** 推送的 JSON（后端 PushPayloadDTO）；offset 越大越新 */
function payload(id: string, offset = 0) {
  return JSON.stringify({
    message: `推送 ${id}`,
    messageId: id,
    source: 'backend',
    timestamp: PUSH_TIME + offset,
    type: 'message',
  });
}

/** 每次连接返回一个保持打开的事件流，send 向最新的连接写入一条事件 */
function eventStreamFetch() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const stream = new ReadableStream<Uint8Array>({
      start(current) {
        controller = current;
        init?.signal?.addEventListener('abort', () =>
          current.error(new DOMException('aborted', 'AbortError')),
        );
      },
    });
    return new Response(stream, {
      headers: { 'content-type': 'text/event-stream;charset=UTF-8' },
      status: 200,
    });
  });
  function send(data: string) {
    controller?.enqueue(encoder.encode(`event:message\ndata:${data}\n\n`));
  }
  return { fetchMock, send };
}

const centers: MessageCenter[] = [];

function setup(token: null | string = 'token-1', user: null | string = 'u1') {
  const auth = { token, user };
  const notify = vi.fn();
  let snapshot: MessageCenterSnapshot = EMPTY_MESSAGE_SNAPSHOT;
  const { fetchMock, send } = eventStreamFetch();
  const center = createMessageCenter({
    accessToken: () => auth.token,
    fetch: fetchMock as unknown as typeof fetch,
    notify,
    onChange: (next) => {
      snapshot = next;
    },
    userId: () => auth.user,
  });
  centers.push(center);
  return { auth, center, fetchMock, notify, send, snapshot: () => snapshot };
}

beforeEach(() => {
  localStorage.clear();
  api.getMessageBox.mockResolvedValue({
    systemList: [
      {
        category: 'system',
        createTime: '2026-11-01 10:00:00',
        message: '历史消息',
        messageId: 'm1',
      },
    ],
  });
  api.closeMessageStream.mockResolvedValue(undefined);
});

afterEach(() => {
  for (const center of centers.splice(0)) {
    center.stop();
  }
  vi.clearAllMocks();
});

describe('消息中心：显示用的数据', () => {
  it('快照去掉已移除的消息，按本地已读状态统计未读数', () => {
    const snapshot = toMessageSnapshot([item('a'), item('b'), item('c')], {
      hidden: ['b'],
      read: ['a', 'b'],
    });
    expect(snapshot.messages.map((message) => message.id)).toEqual(['a', 'c']);
    expect(snapshot.unreadCount).toBe(1);
    expect(snapshot.read.has('a')).toBe(true);
  });

  it('按分类筛选，筛选项为全部与三个分类', () => {
    const messages = [item('a', 'system'), item('b', 'workflow')];
    expect(filterMessages(messages, 'all')).toBe(messages);
    expect(filterMessages(messages, 'workflow').map((m) => m.id)).toEqual([
      'b',
    ]);
    expect(messageFilterOptions()).toEqual([
      { label: 'page.message.all', value: 'all' },
      { label: 'page.message.category.system', value: 'system' },
      { label: 'page.message.category.notice', value: 'notice' },
      { label: 'page.message.category.workflow', value: 'workflow' },
    ]);
  });

  it('路径落到兜底的 404 路由、为空或无法解析时不能打开', () => {
    const router = {
      resolve: (path: string) => {
        if (path === '/broken') {
          throw new Error('invalid');
        }
        return {
          matched: [
            { name: 'Root' },
            { name: path === '/task' ? 'TaskWaiting' : 'FallbackNotFound' },
          ],
        };
      },
    };
    expect(canOpenMessagePath(router, '/task')).toBe(true);
    expect(canOpenMessagePath(router, '/no-permission')).toBe(false);
    expect(canOpenMessagePath(router, '/broken')).toBe(false);
    expect(canOpenMessagePath(router, undefined)).toBe(false);
    expect(canOpenMessagePath({ resolve: () => ({ matched: [] }) }, '/x')).toBe(
      false,
    );
  });
});

describe('消息中心：连接与状态', () => {
  it('未登录时不加载、不连接', () => {
    const { center, fetchMock } = setup(null);
    center.start();
    expect(api.getMessageBox).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('加载历史消息并通过请求头带令牌连接；新推送提示一次，重复的不再提示', async () => {
    const { center, fetchMock, notify, send, snapshot } = setup();
    center.start();
    // 重复调用无效
    center.start();
    await vi.waitFor(() => expect(snapshot().messages).toHaveLength(1));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/resource/message');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer token-1',
      clientid: 'test-client',
      'Content-Language': 'zh_CN',
    });

    send(payload('m2'));
    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    expect(notify.mock.calls[0]?.[0]).toMatchObject({ id: 'm2' });
    expect(notify.mock.calls[0]?.[1]).toBe('page.message.category.system');

    send(payload('m2'));
    send(payload('m3', 1000));
    await vi.waitFor(() => expect(snapshot().messages).toHaveLength(3));
    expect(notify).toHaveBeenCalledTimes(2);
    expect(snapshot().messages.map((message) => message.id)).toEqual([
      'm3',
      'm2',
      'm1',
    ]);
    expect(snapshot().unreadCount).toBe(3);
  });

  it('已读、移除、清空只记在本地，按用户保存，重新开始后仍然有效', async () => {
    const first = setup();
    first.center.start();
    await vi.waitFor(() => expect(first.snapshot().messages).toHaveLength(1));
    first.send(payload('m2'));
    await vi.waitFor(() => expect(first.snapshot().messages).toHaveLength(2));

    first.center.markRead('m1');
    expect(first.snapshot().read.has('m1')).toBe(true);
    expect(first.snapshot().unreadCount).toBe(1);
    first.center.remove('m2');
    expect(first.snapshot().messages.map((message) => message.id)).toEqual([
      'm1',
    ]);

    // 已移除的消息再次推送时不显示、不提示
    first.notify.mockClear();
    first.send(payload('m2'));
    first.send(payload('m4', 2000));
    await vi.waitFor(() => expect(first.notify).toHaveBeenCalledTimes(1));
    expect(first.notify.mock.calls[0]?.[0]).toMatchObject({ id: 'm4' });
    expect(first.snapshot().messages.map((message) => message.id)).toEqual([
      'm4',
      'm1',
    ]);
    first.center.markAllRead();
    expect(first.snapshot().unreadCount).toBe(0);
    first.center.stop();

    const second = setup();
    second.center.start();
    await vi.waitFor(() => expect(second.snapshot().messages).toHaveLength(1));
    expect(second.snapshot().read.has('m1')).toBe(true);
    expect(second.snapshot().unreadCount).toBe(0);
    second.center.clear();
    expect(second.snapshot().messages).toEqual([]);

    // 其他用户不受影响
    const other = setup('token-2', 'u2');
    other.center.start();
    await vi.waitFor(() => expect(other.snapshot().messages).toHaveLength(1));
    expect(other.snapshot().unreadCount).toBe(1);
  });

  it('另一个页面连上后本页暂停，回到本页时重新加载并连接', async () => {
    const { center, fetchMock, send } = setup();
    center.start();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    send('kicked');
    // 页面可见性变化前不重连
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(api.getMessageBox).toHaveBeenCalledTimes(2);
  });

  it('换了用户时清空上一个用户的消息', async () => {
    const { auth, center, snapshot } = setup();
    center.start();
    await vi.waitFor(() => expect(snapshot().messages).toHaveLength(1));
    center.stop();

    api.getMessageBox.mockResolvedValue({});
    auth.user = 'u2';
    center.start();
    expect(snapshot().messages).toEqual([]);
  });

  it('退出前断开：通知后端关闭本令牌的连接，失败时不影响退出', async () => {
    const { center, fetchMock } = setup();
    center.start();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    api.closeMessageStream.mockRejectedValue(new Error('network'));
    await expect(center.disconnect()).resolves.toBeUndefined();
    expect(api.closeMessageStream).toHaveBeenCalledWith('token-1');
  });

  it('重置后清空状态', async () => {
    const { center, snapshot } = setup();
    center.start();
    await vi.waitFor(() => expect(snapshot().messages).toHaveLength(1));
    center.reset();
    expect(snapshot()).toEqual(EMPTY_MESSAGE_SNAPSHOT);
  });
});
