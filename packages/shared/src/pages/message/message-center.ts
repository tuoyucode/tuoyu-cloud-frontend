/**
 * 消息中心（页头铃铛）的状态与连接，与 UI 组件库和响应式框架都无关：
 * 打开页面时加载历史消息，之后通过 SSE 接收推送；已读、已移除只记录在本地（后端没有已读接口）。
 *
 * 应用用 pinia 包一层：把 onChange 收到的快照放进响应式状态，并注入收到新消息时的提示（notify）
 */
import type {
  MessageCategory,
  MessageItem,
  MessageLocalState,
} from '../../utils/message-box';
import type { SseEvent } from '../../utils/sse';

import { $t } from '@vben/locales';

import {
  closeMessageStream,
  getMessageBox,
  messageStreamUrl,
} from '../../api/core/message';
import { CLIENT_ID, contentLanguage, formatToken } from '../../api/request';
import {
  appendIds,
  fromMessageBox,
  loadMessageState,
  mergeMessages,
  parsePushData,
  saveMessageState,
} from '../../utils/message-box';
import { createEventStream } from '../../utils/sse';

/** 超过这个时间没有收到任何数据就重连（后端每 60 秒发一次心跳） */
export const MESSAGE_IDLE_TIMEOUT = 150_000;

/** 铃铛显示用的状态快照（每次变化都生成新的对象） */
export interface MessageCenterSnapshot {
  /** 铃铛中显示的消息（去掉已移除的），按时间倒序 */
  messages: readonly MessageItem[];
  /** 已读的消息 ID */
  read: ReadonlySet<string>;
  unreadCount: number;
}

export const EMPTY_MESSAGE_SNAPSHOT: MessageCenterSnapshot = Object.freeze({
  messages: [],
  read: new Set<string>(),
  unreadCount: 0,
});

/** 消息分类的显示名 */
export function messageCategoryLabel(item: Pick<MessageItem, 'category'>) {
  return $t(`page.message.category.${item.category}`);
}

/** 各分类的图标（Iconify 名称） */
export const MESSAGE_CATEGORY_ICONS: Readonly<Record<MessageCategory, string>> =
  {
    notice: 'lucide:megaphone',
    system: 'lucide:bell',
    workflow: 'lucide:git-pull-request-arrow',
  };

/** “全部消息”中的分类筛选 */
export type MessageFilter = 'all' | MessageCategory;

/** 筛选项：全部与各分类 */
export function messageFilterOptions(): {
  label: string;
  value: MessageFilter;
}[] {
  return (['all', 'system', 'notice', 'workflow'] as const).map((value) => ({
    label:
      value === 'all'
        ? $t('page.message.all')
        : messageCategoryLabel({ category: value }),
    value,
  }));
}

/** 按分类筛选消息 */
export function filterMessages(
  messages: readonly MessageItem[],
  filter: MessageFilter,
): readonly MessageItem[] {
  return filter === 'all'
    ? messages
    : messages.filter((item) => item.category === filter);
}

/** 解析路由地址需要的最小接口（vue-router 的 Router 满足它） */
export interface MessageRouteResolver {
  resolve: (path: string) => { matched: readonly { name?: unknown }[] };
}

/**
 * 消息中的路径是否对应当前用户可以访问的页面：没有菜单权限时路由不存在，
 * 解析结果落到兜底的 404 路由（FallbackNotFound）
 */
export function canOpenMessagePath(
  router: MessageRouteResolver,
  path?: string,
): path is string {
  if (!path) {
    return false;
  }
  try {
    const last = router.resolve(path).matched.at(-1);
    return !!last && last.name !== 'FallbackNotFound';
  } catch {
    return false;
  }
}

/** 由全部消息与本地状态得到铃铛显示用的快照 */
export function toMessageSnapshot(
  items: readonly MessageItem[],
  state: MessageLocalState,
): MessageCenterSnapshot {
  const hidden = new Set(state.hidden);
  const read = new Set(state.read);
  const messages = items.filter((item) => !hidden.has(item.id));
  return {
    messages,
    read,
    unreadCount: messages.filter((item) => !read.has(item.id)).length,
  };
}

export interface MessageCenterOptions {
  /** 当前的访问令牌；未登录时为空 */
  accessToken: () => null | string | undefined;
  /** 测试时替换 fetch */
  fetch?: typeof fetch;
  /** 收到一条新的实时推送（不是已有或已移除的消息）时提示，title 为分类名 */
  notify: (item: MessageItem, title: string) => void;
  /** 状态变化时回调最新的快照 */
  onChange: (snapshot: MessageCenterSnapshot) => void;
  /** 当前用户 ID，本地的已读、已移除状态按用户保存 */
  userId: () => null | string | undefined;
}

export interface MessageCenter {
  /** 清空铃铛（全部记为已移除，只在本地记录） */
  clear: () => void;
  /**
   * 退出登录前调用：断开连接并通知后端释放本令牌的连接。
   * 尽力而为，失败不影响退出
   */
  disconnect: () => Promise<void>;
  markAllRead: () => void;
  markRead: (id: string) => void;
  /** 从铃铛中移除（只在本地记录，刷新后也不再显示） */
  remove: (id: string) => void;
  /** 停止接收并清空状态（例如重置所有 store 时） */
  reset: () => void;
  /** 令牌变化（例如登录失效后重新登录）时用新令牌重新连接 */
  restart: () => void;
  /** 开始接收：加载历史消息并建立推送连接（已开始或未登录时无效） */
  start: () => void;
  /** 停止接收（不通知后端），例如登录失效时 */
  stop: () => void;
}

function emptyState(): MessageLocalState {
  return { hidden: [], read: [] };
}

/**
 * 创建消息中心。同一令牌只能有一个推送连接：另一个页面连上后，本页收到 kicked 并暂停，
 * 回到本页（页面重新可见）时重新加载历史消息并连接
 */
export function createMessageCenter(
  options: MessageCenterOptions,
): MessageCenter {
  let items: MessageItem[] = [];
  let localState = emptyState();
  /** 是否已开始接收（start 之后、stop 之前） */
  let active = false;
  /** 同一令牌的另一个页面建立了连接，本页暂停接收，回到本页时再连接 */
  let kicked = false;
  let userId: null | string = null;
  /** 服务端没有开启推送时只提示一次 */
  let warnedUnavailable = false;
  let snapshot = EMPTY_MESSAGE_SNAPSHOT;

  function emit() {
    snapshot = toMessageSnapshot(items, localState);
    options.onChange(snapshot);
  }

  function setLocalState(state: MessageLocalState) {
    localState = state;
    if (userId) {
      saveMessageState(userId, localState);
    }
    emit();
  }

  const stream = createEventStream({
    fetch: options.fetch,
    headers: () => {
      const token = formatToken(options.accessToken() ?? null);
      if (!token) {
        return null;
      }
      return {
        Authorization: token,
        clientid: CLIENT_ID,
        'Content-Language': contentLanguage(),
      };
    },
    idleTimeout: MESSAGE_IDLE_TIMEOUT,
    onEvent: handleEvent,
    onStop: (reason) => {
      if (reason === 'unavailable' && !warnedUnavailable) {
        warnedUnavailable = true;
        // 后端关闭了消息推送（message.enabled=false）或没有部署资源服务：只显示历史消息
        console.warn('[message] 实时消息不可用，只显示历史消息');
      }
    },
    url: messageStreamUrl(),
  });

  function handleEvent(event: SseEvent) {
    if (event.event !== 'message') {
      return;
    }
    const result = parsePushData(event.data);
    if (result.kind === 'kicked') {
      kicked = true;
      stream.stop();
      return;
    }
    if (result.kind !== 'message') {
      return;
    }
    const { item } = result;
    if (localState.hidden.includes(item.id)) {
      return;
    }
    const isNew = !items.some((existing) => existing.id === item.id);
    items = mergeMessages(items, [item]);
    emit();
    if (isNew) {
      options.notify(item, messageCategoryLabel(item));
    }
  }

  async function loadHistory() {
    try {
      const box = await getMessageBox();
      items = mergeMessages(items, fromMessageBox(box));
      emit();
    } catch {
      // 消息服务不可用时铃铛中只显示之后收到的推送
    }
  }

  function onVisibilityChange() {
    if (active && kicked && document.visibilityState === 'visible') {
      kicked = false;
      void loadHistory();
      stream.start();
    }
  }

  function start() {
    if (active || !options.accessToken()) {
      return;
    }
    active = true;
    kicked = false;
    const currentUser = options.userId() ?? null;
    if (currentUser !== userId) {
      items = [];
    }
    userId = currentUser;
    localState = userId ? loadMessageState(userId) : emptyState();
    emit();
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadHistory();
    stream.start();
  }

  function stop() {
    active = false;
    kicked = false;
    stream.stop();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  function restart() {
    stop();
    start();
  }

  async function disconnect() {
    const token = options.accessToken() ?? null;
    stop();
    try {
      await closeMessageStream(token);
    } catch {
      // 令牌已失效等情况下忽略
    }
  }

  function markRead(id: string) {
    if (snapshot.read.has(id)) {
      return;
    }
    setLocalState({
      ...localState,
      read: appendIds(localState.read, [id]),
    });
  }

  function markAllRead() {
    setLocalState({
      ...localState,
      read: appendIds(
        localState.read,
        snapshot.messages.map((item) => item.id),
      ),
    });
  }

  function remove(id: string) {
    setLocalState({
      hidden: appendIds(localState.hidden, [id]),
      read: appendIds(localState.read, [id]),
    });
  }

  function clear() {
    const ids = snapshot.messages.map((item) => item.id);
    setLocalState({
      hidden: appendIds(localState.hidden, ids),
      read: appendIds(localState.read, ids),
    });
  }

  function reset() {
    stop();
    items = [];
    localState = emptyState();
    userId = null;
    emit();
  }

  return {
    clear,
    disconnect,
    markAllRead,
    markRead,
    remove,
    reset,
    restart,
    start,
    stop,
  };
}
