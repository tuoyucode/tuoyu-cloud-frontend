import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEventStream, createSseParser, reconnectDelay } from '../sse';

function collect() {
  const events: Array<{ data: string; event: string; id?: string }> = [];
  const comments: string[] = [];
  const retries: number[] = [];
  const parser = createSseParser({
    onComment: (text) => comments.push(text),
    onEvent: (event) => events.push(event),
    onRetry: (millis) => retries.push(millis),
  });
  return { comments, events, parser, retries };
}

describe('createSseParser', () => {
  it('解析后端的推送格式：事件名、JSON 数据与注释（心跳）', () => {
    const { comments, events, parser } = collect();
    parser.feed(':connected\n\n');
    parser.feed(
      'event:message\ndata:{"message":"[通知] 标题","type":"notice"}\n\n',
    );
    parser.feed(':heartbeat\n\n');
    expect(comments).toEqual(['connected', 'heartbeat']);
    expect(events).toEqual([
      {
        data: '{"message":"[通知] 标题","type":"notice"}',
        event: 'message',
        id: undefined,
      },
    ]);
  });

  it('数据可以在任意位置截断，包括 CRLF 的两个字符之间', () => {
    const { events, parser } = collect();
    const text = 'event: message\r\ndata: 第一行\r\ndata: 第二行\r\n\r\n';
    for (const char of text) {
      parser.feed(char);
    }
    expect(events).toEqual([
      { data: '第一行\n第二行', event: 'message', id: undefined },
    ]);
  });

  it('支持单独的 CR 作为行结束符，去掉冒号后的一个空格', () => {
    const { events, parser } = collect();
    parser.feed('data:  两个空格\r\r');
    // 末尾的 \r 要等下一段才知道是不是 \r\n
    expect(events).toHaveLength(0);
    parser.feed('event: next\r');
    expect(events[0]?.data).toBe(' 两个空格');
  });

  it('没有 event 字段时事件名为 message，id 会保留到之后的事件', () => {
    const { events, parser } = collect();
    parser.feed('id: 7\ndata: a\n\ndata: b\n\n');
    expect(events).toEqual([
      { data: 'a', event: 'message', id: '7' },
      { data: 'b', event: 'message', id: '7' },
    ]);
  });

  it('没有 data 的事件不分发，事件名不会带到下一条', () => {
    const { events, parser } = collect();
    parser.feed('event: ping\n\ndata: x\n\n');
    expect(events).toEqual([{ data: 'x', event: 'message', id: undefined }]);
  });

  it('retry 字段只接受数字；未知字段忽略；流开头的 BOM 去掉', () => {
    const { events, parser, retries } = collect();
    parser.feed('﻿retry: 3000\nretry: abc\nfoo: bar\ndata: ok\n\n');
    expect(retries).toEqual([3000]);
    expect(events).toEqual([{ data: 'ok', event: 'message', id: undefined }]);
  });

  it('流结束时丢弃没有以空行结束的半条事件', () => {
    const { events, parser } = collect();
    parser.feed('data: 半条');
    parser.end();
    parser.feed('data: 新的\n\n');
    expect(events).toEqual([{ data: '新的', event: 'message', id: undefined }]);
  });
});

describe('reconnectDelay', () => {
  it('指数增长并在上限处封顶，随机范围为一半到全部', () => {
    const options = { initial: 1000, max: 8000 };
    expect(reconnectDelay(1, options, () => 0)).toBe(500);
    expect(reconnectDelay(1, options, () => 1)).toBe(1000);
    expect(reconnectDelay(2, options, () => 1)).toBe(2000);
    expect(reconnectDelay(3, options, () => 1)).toBe(4000);
    expect(reconnectDelay(4, options, () => 1)).toBe(8000);
    expect(reconnectDelay(10, options, () => 1)).toBe(8000);
    expect(reconnectDelay(10, options, () => 0)).toBe(4000);
  });
});

/** 构造一个 SSE 响应，chunks 依次返回，最后结束（或保持打开直到中止） */
function sseResponse(chunks: string[], keepOpen = false, signal?: AbortSignal) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      if (keepOpen) {
        signal?.addEventListener('abort', () =>
          controller.error(new DOMException('aborted', 'AbortError')),
        );
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream;charset=UTF-8' },
    status: 200,
  });
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

const HEADERS = { Authorization: 'Bearer t', clientid: 'c' };

describe('createEventStream', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('令牌放在请求头中（不放进 URL），收到事件后回调', async () => {
    const onEvent = vi.fn();
    let resolveStop: (reason: string) => void = () => {};
    const stopped = new Promise<string>((resolve) => (resolveStop = resolve));
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      sseResponse(['data: hello\n\n'], true, init?.signal ?? undefined),
    );
    const stream = createEventStream({
      fetch: fetchMock as unknown as typeof fetch,
      headers: () => HEADERS,
      onEvent,
      onStop: resolveStop,
      url: '/api/resource/message',
    });
    stream.start();
    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({ data: 'hello' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/resource/message');
    expect(init?.headers).toMatchObject({
      Accept: 'text/event-stream',
      Authorization: 'Bearer t',
    });
    expect(stream.running).toBe(true);
    stream.stop();
    expect(await stopped).toBe('stopped');
    expect(stream.running).toBe(false);
  });

  it('连接断开后按退避重连；连上过再断开时从头计算退避', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockRejectedValueOnce(new TypeError('network'))
      .mockImplementation(async () => sseResponse(['data: x\n\n']));
    const onEvent = vi.fn();
    const stream = createEventStream({
      backoff: { initial: 1000, max: 10_000 },
      fetch: fetchMock,
      headers: () => HEADERS,
      onEvent,
      random: () => 1,
      url: '/s',
    });
    stream.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // 第 1 次失败后等 1 秒
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // 第 2 次失败后等 2 秒
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onEvent).toHaveBeenCalledTimes(1);
    // 第 3 次连上后流结束：等待时间回到 1 秒
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    stream.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('后端返回未登录（HTTP 200 + code 401）时停止，不重连', async () => {
    const onStop = vi.fn();
    const fetchMock = vi.fn(async () =>
      jsonResponse({ code: 401, msg: '未登录' }),
    );
    const stream = createEventStream({
      fetch: fetchMock as unknown as typeof fetch,
      headers: () => HEADERS,
      onEvent: vi.fn(),
      onStop,
      url: '/s',
    });
    stream.start();
    await vi.waitFor(() => expect(onStop).toHaveBeenCalledWith('unauthorized'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(stream.running).toBe(false);
  });

  it('接口不存在（关闭了消息推送）时停止，不反复请求', async () => {
    const onStop = vi.fn();
    const fetchMock = vi.fn(async () =>
      jsonResponse({ code: 404, msg: 'Not Found' }, 404),
    );
    const stream = createEventStream({
      fetch: fetchMock as unknown as typeof fetch,
      headers: () => HEADERS,
      onEvent: vi.fn(),
      onStop,
      url: '/s',
    });
    stream.start();
    await vi.waitFor(() => expect(onStop).toHaveBeenCalledWith('unavailable'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('服务暂时不可用（5xx 或 code 500）时重连', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ code: 500, msg: 'down' }))
      .mockImplementation(async (_url: string, init?: RequestInit) =>
        sseResponse([], true, init?.signal ?? undefined),
      );
    const stream = createEventStream({
      backoff: { initial: 100, max: 100 },
      fetch: fetchMock,
      headers: () => HEADERS,
      onEvent: vi.fn(),
      random: () => 1,
      url: '/s',
    });
    stream.start();
    await vi.advanceTimersByTimeAsync(250);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    stream.stop();
  });

  it('没有令牌时不发请求', async () => {
    const onStop = vi.fn();
    const fetchMock = vi.fn();
    const stream = createEventStream({
      fetch: fetchMock,
      headers: () => null,
      onEvent: vi.fn(),
      onStop,
      url: '/s',
    });
    stream.start();
    await vi.waitFor(() => expect(onStop).toHaveBeenCalledWith('unauthorized'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('长时间没有任何数据（连心跳都没有）时断开重连', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      sseResponse([':connected\n\n'], true, init?.signal ?? undefined),
    );
    const stream = createEventStream({
      backoff: { initial: 100, max: 100 },
      fetch: fetchMock as unknown as typeof fetch,
      headers: () => HEADERS,
      idleTimeout: 5000,
      onEvent: vi.fn(),
      random: () => 1,
      url: '/s',
    });
    stream.start();
    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1 + 100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stream.stop();
  });

  it('处理某条事件出错不影响后续事件', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const received: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      sseResponse(
        ['data: bad\n\n', 'data: good\n\n'],
        true,
        init?.signal ?? undefined,
      ),
    );
    const stream = createEventStream({
      fetch: fetchMock as unknown as typeof fetch,
      headers: () => HEADERS,
      onEvent: (event) => {
        if (event.data === 'bad') {
          throw new Error('boom');
        }
        received.push(event.data);
      },
      url: '/s',
    });
    stream.start();
    await vi.waitFor(() => expect(received).toEqual(['good']));
    stream.stop();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
