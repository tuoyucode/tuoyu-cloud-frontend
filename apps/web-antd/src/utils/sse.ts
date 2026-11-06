/**
 * Server-Sent Events 客户端：用 fetch 读取 text/event-stream，令牌放在请求头中。
 *
 * 浏览器自带的 EventSource 不能设置请求头，只能把令牌放进 URL（会写进网关与服务端的访问日志），
 * 所以这里自己读取响应流并按 SSE 规范解析，断线后按指数退避重连。
 */

/** 一条 SSE 事件 */
export interface SseEvent {
  data: string;
  /** 事件名，没有 event 字段时为 message */
  event: string;
  id?: string;
}

export interface SseParserHandlers {
  /** 注释行（以冒号开头，例如服务端的心跳 `:heartbeat`） */
  onComment?: (text: string) => void;
  onEvent: (event: SseEvent) => void;
  /** 服务端通过 retry 字段建议的重连间隔（毫秒） */
  onRetry?: (millis: number) => void;
}

export interface SseParser {
  /** 流结束：未以空行结束的半条事件按规范丢弃 */
  end: () => void;
  /** 送入一段已解码的文本，可以在任意位置截断 */
  feed: (chunk: string) => void;
}

/**
 * 创建 SSE 解析器（按 HTML 规范的 event stream 解析规则）：
 * 行结束符可以是 \r\n、\n 或 \r；data 多行用 \n 连接；空行分发事件；冒号后的一个空格会被去掉
 */
export function createSseParser(handlers: SseParserHandlers): SseParser {
  let buffer = '';
  let started = false;
  let data: string[] = [];
  let eventName = '';
  let lastId: string | undefined;

  function dispatch() {
    if (data.length === 0) {
      eventName = '';
      return;
    }
    const event: SseEvent = {
      data: data.join('\n'),
      event: eventName || 'message',
      id: lastId,
    };
    data = [];
    eventName = '';
    handlers.onEvent(event);
  }

  function processLine(line: string) {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) {
      handlers.onComment?.(line.slice(1).trimStart());
      return;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }
    switch (field) {
      case 'data': {
        data.push(value);
        break;
      }
      case 'event': {
        eventName = value;
        break;
      }
      case 'id': {
        if (!value.includes('\0')) {
          lastId = value;
        }
        break;
      }
      case 'retry': {
        if (/^\d+$/.test(value)) {
          handlers.onRetry?.(Number(value));
        }
        break;
      }
      // 其他字段按规范忽略
    }
  }

  return {
    end() {
      buffer = '';
      data = [];
      eventName = '';
    },
    feed(chunk: string) {
      if (!started && chunk.length > 0) {
        started = true;
        // 流开头的 BOM 不属于内容
        if (chunk.startsWith('﻿')) {
          chunk = chunk.slice(1);
        }
      }
      buffer += chunk;
      let pos = 0;
      while (pos < buffer.length) {
        const cr = buffer.indexOf('\r', pos);
        const lf = buffer.indexOf('\n', pos);
        if (cr === -1 && lf === -1) {
          break;
        }
        let end: number;
        let next: number;
        if (cr !== -1 && (lf === -1 || cr < lf)) {
          // \r 在末尾时还不知道后面是不是 \n，等下一段
          if (cr === buffer.length - 1) {
            break;
          }
          end = cr;
          next = buffer[cr + 1] === '\n' ? cr + 2 : cr + 1;
        } else {
          end = lf;
          next = lf + 1;
        }
        processLine(buffer.slice(pos, end));
        pos = next;
      }
      buffer = buffer.slice(pos);
    },
  };
}

/** 重连退避参数（毫秒） */
export interface BackoffOptions {
  initial: number;
  max: number;
}

export const DEFAULT_BACKOFF: BackoffOptions = { initial: 2000, max: 60_000 };

/**
 * 第 attempt 次（从 1 开始）重连前的等待时间：指数增长、不超过上限，
 * 在 [一半, 全部] 之间随机，避免服务恢复时所有页面同时重连
 */
export function reconnectDelay(
  attempt: number,
  options: BackoffOptions = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const exponent = Math.max(0, attempt - 1);
  const base = Math.min(options.max, options.initial * 2 ** exponent);
  return Math.round(base / 2 + (random() * base) / 2);
}

/**
 * 连接停止的原因：
 * - stopped：调用了 stop()
 * - unauthorized：未登录或登录已失效（不重连，交给普通请求触发重新登录）
 * - unavailable：服务端没有这个接口或拒绝访问（例如关闭了消息推送），不重连
 */
export type EventStreamStopReason = 'stopped' | 'unauthorized' | 'unavailable';

/** 一次连接的结果 */
type AttemptOutcome = 'retry' | Exclude<EventStreamStopReason, 'stopped'>;

export interface EventStreamOptions {
  backoff?: BackoffOptions;
  fetch?: typeof fetch;
  /** 请求头；返回 null 表示没有登录，停止连接 */
  headers: () => null | Record<string, string>;
  /**
   * 超过这个时间（毫秒）没有收到任何数据（包括心跳注释）就断开重连。
   * 用于发现被代理静默断开的连接；0 表示不检查
   */
  idleTimeout?: number;
  onComment?: (text: string) => void;
  onEvent: (event: SseEvent) => void;
  /** 连接建立（收到 text/event-stream 响应） */
  onOpen?: () => void;
  /** 连接最终停止（不再重连） */
  onStop?: (reason: EventStreamStopReason) => void;
  random?: () => number;
  url: string;
}

export interface EventStream {
  /** 是否正在连接或等待重连 */
  readonly running: boolean;
  start: () => void;
  stop: () => void;
}

/**
 * 按响应判断连接结果：后端未登录时以 HTTP 200 + JSON（code 401）返回；
 * 网关或服务暂时不可用（5xx）时重连；其他（404、403 等）视为服务端没有开启推送
 */
async function classifyFailedResponse(
  response: Response,
): Promise<AttemptOutcome> {
  if (response.status === 401) {
    return 'unauthorized';
  }
  if (response.status >= 500) {
    return 'retry';
  }
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('json')) {
    try {
      const body = await response.json();
      const code = Number(body?.code);
      if (code === 401) {
        return 'unauthorized';
      }
      if (code >= 500) {
        return 'retry';
      }
    } catch {
      // 不是合法的 JSON，按不可用处理
    }
  }
  return 'unavailable';
}

/**
 * 创建自动重连的 SSE 连接（调用 start() 后开始连接）
 */
export function createEventStream(options: EventStreamOptions): EventStream {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const backoff = options.backoff ?? DEFAULT_BACKOFF;
  const idleTimeout = options.idleTimeout ?? 0;

  let controller: AbortController | null = null;
  /** 服务端通过 retry 字段建议的最短重连间隔 */
  let serverRetry = 0;

  function sleep(millis: number, signal: AbortSignal) {
    return new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const timer = setTimeout(done, millis);
      signal.addEventListener('abort', done, { once: true });
      function done() {
        clearTimeout(timer);
        signal.removeEventListener('abort', done);
        resolve();
      }
    });
  }

  /** 建立一次连接并读到结束；返回是否曾经连上以及结果 */
  async function attempt(
    signal: AbortSignal,
  ): Promise<{ opened: boolean; outcome: AttemptOutcome }> {
    const headers = options.headers();
    if (!headers) {
      return { opened: false, outcome: 'unauthorized' };
    }
    // 每次连接单独一个 AbortController：空闲超时只断开这一次连接
    const connection = new AbortController();
    const abortConnection = () => connection.abort();
    signal.addEventListener('abort', abortConnection, { once: true });
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const resetIdle = () => {
      if (idleTimeout > 0) {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(abortConnection, idleTimeout);
      }
    };
    try {
      let response: Response;
      try {
        response = await fetchImpl(options.url, {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { ...headers, Accept: 'text/event-stream' },
          signal: connection.signal,
        });
      } catch {
        return { opened: false, outcome: 'retry' };
      }
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !type.includes('text/event-stream')) {
        return {
          opened: false,
          outcome: await classifyFailedResponse(response),
        };
      }
      if (!response.body) {
        return { opened: false, outcome: 'unavailable' };
      }
      options.onOpen?.();
      const parser = createSseParser({
        onComment: options.onComment,
        onEvent: (event) => {
          try {
            options.onEvent(event);
          } catch (error) {
            // 处理某条消息出错不影响后续消息
            console.error(error);
          }
        },
        onRetry: (millis) => {
          serverRetry = millis;
        },
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      resetIdle();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          resetIdle();
          parser.feed(decoder.decode(value, { stream: true }));
        }
        parser.feed(decoder.decode());
      } catch {
        // 连接中断（包括主动断开、空闲超时），按断线重连处理
      } finally {
        parser.end();
        reader.cancel().catch(() => {});
      }
      return { opened: true, outcome: 'retry' };
    } finally {
      clearTimeout(idleTimer);
      signal.removeEventListener('abort', abortConnection);
    }
  }

  async function run(current: AbortController) {
    const { signal } = current;
    let failures = 0;
    let reason: EventStreamStopReason = 'stopped';
    while (!signal.aborted) {
      const { opened, outcome } = await attempt(signal);
      if (signal.aborted) {
        break;
      }
      if (outcome !== 'retry') {
        reason = outcome;
        break;
      }
      // 连上过再断开时从头计算退避
      failures = opened ? 1 : failures + 1;
      const delay = Math.max(
        serverRetry,
        reconnectDelay(failures, backoff, options.random),
      );
      await sleep(delay, signal);
    }
    if (controller === current) {
      controller = null;
    }
    options.onStop?.(reason);
  }

  return {
    get running() {
      return controller !== null;
    },
    start() {
      if (controller) {
        return;
      }
      const current = new AbortController();
      controller = current;
      void run(current);
    },
    stop() {
      const current = controller;
      controller = null;
      current?.abort();
    },
  };
}
