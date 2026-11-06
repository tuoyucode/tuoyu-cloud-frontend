import type { MessageItem, MessageLocalState } from '#/utils/message-box';
import type { SseEvent } from '#/utils/sse';

import { computed, ref } from 'vue';

import { useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import {
  closeMessageStream,
  getMessageBox,
  messageStreamUrl,
} from '#/api/core/message';
import { CLIENT_ID, contentLanguage, formatToken } from '#/api/request';
import { $t } from '#/locales';
import {
  appendIds,
  fromMessageBox,
  loadMessageState,
  mergeMessages,
  parsePushData,
  saveMessageState,
} from '#/utils/message-box';
import { createEventStream } from '#/utils/sse';

/** 超过这个时间没有收到任何数据就重连（后端每 60 秒发一次心跳） */
const IDLE_TIMEOUT = 150_000;

/** 实时提示共用一个 key：连续收到多条时只显示最新的一条，不会刷屏 */
const TOAST_KEY = 'tuoyu-message-toast';

/**
 * 消息中心：打开页面时加载历史消息，之后通过 SSE 接收推送。
 * 已读、已移除只记录在本地（后端没有已读接口）
 */
export const useMessageStore = defineStore('message', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  const items = ref<MessageItem[]>([]);
  const localState = ref<MessageLocalState>({ hidden: [], read: [] });

  /** 是否已开始接收（start 之后、stop 之前） */
  let active = false;
  /** 同一令牌的另一个页面建立了连接，本页暂停接收，回到本页时再连接 */
  let kicked = false;
  let userId: null | string = null;
  /** 服务端没有开启推送时只提示一次 */
  let warnedUnavailable = false;

  const hiddenIds = computed(() => new Set(localState.value.hidden));
  const readIds = computed(() => new Set(localState.value.read));

  /** 铃铛中显示的消息（去掉已移除的） */
  const messages = computed(() =>
    items.value.filter((item) => !hiddenIds.value.has(item.id)),
  );
  const unreadCount = computed(
    () => messages.value.filter((item) => !readIds.value.has(item.id)).length,
  );

  const stream = createEventStream({
    headers: () => {
      const token = formatToken(accessStore.accessToken);
      if (!token) {
        return null;
      }
      return {
        Authorization: token,
        clientid: CLIENT_ID,
        'Content-Language': contentLanguage(),
      };
    },
    idleTimeout: IDLE_TIMEOUT,
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

  function persist() {
    if (userId) {
      saveMessageState(userId, localState.value);
    }
  }

  function categoryLabel(item: MessageItem) {
    return $t(`page.message.category.${item.category}`);
  }

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
    if (hiddenIds.value.has(item.id)) {
      return;
    }
    const isNew = !items.value.some((existing) => existing.id === item.id);
    items.value = mergeMessages(items.value, [item]);
    if (isNew) {
      notification.open({
        description: item.message,
        duration: 4.5,
        key: TOAST_KEY,
        message: categoryLabel(item),
        placement: 'topRight',
      });
    }
  }

  async function loadHistory() {
    try {
      const box = await getMessageBox();
      items.value = mergeMessages(items.value, fromMessageBox(box));
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

  /** 开始接收：加载历史消息并建立推送连接（重复调用无效） */
  function start() {
    if (active || !accessStore.accessToken) {
      return;
    }
    active = true;
    kicked = false;
    const currentUser = userStore.userInfo?.userId ?? null;
    if (currentUser !== userId) {
      items.value = [];
    }
    userId = currentUser;
    localState.value = userId
      ? loadMessageState(userId)
      : { hidden: [], read: [] };
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadHistory();
    stream.start();
  }

  /** 停止接收（不通知后端），例如登录失效时 */
  function stop() {
    active = false;
    kicked = false;
    stream.stop();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  /** 令牌变化（例如登录失效后重新登录）时用新令牌重新连接 */
  function restart() {
    stop();
    start();
  }

  /**
   * 退出登录前调用：断开连接并通知后端释放本令牌的连接。
   * 尽力而为，失败不影响退出
   */
  async function disconnect() {
    const token = accessStore.accessToken;
    stop();
    try {
      await closeMessageStream(token);
    } catch {
      // 令牌已失效等情况下忽略
    }
  }

  function isRead(id: string) {
    return readIds.value.has(id);
  }

  function markRead(id: string) {
    if (readIds.value.has(id)) {
      return;
    }
    localState.value = {
      ...localState.value,
      read: appendIds(localState.value.read, [id]),
    };
    persist();
  }

  function markAllRead() {
    localState.value = {
      ...localState.value,
      read: appendIds(
        localState.value.read,
        messages.value.map((item) => item.id),
      ),
    };
    persist();
  }

  /** 从铃铛中移除（只在本地记录，刷新后也不再显示） */
  function remove(id: string) {
    localState.value = {
      hidden: appendIds(localState.value.hidden, [id]),
      read: appendIds(localState.value.read, [id]),
    };
    persist();
  }

  function clear() {
    const ids = messages.value.map((item) => item.id);
    localState.value = {
      hidden: appendIds(localState.value.hidden, ids),
      read: appendIds(localState.value.read, ids),
    };
    persist();
  }

  function $reset() {
    stop();
    items.value = [];
    localState.value = { hidden: [], read: [] };
    userId = null;
  }

  return {
    $reset,
    categoryLabel,
    clear,
    disconnect,
    isRead,
    markAllRead,
    markRead,
    messages,
    remove,
    restart,
    start,
    stop,
    unreadCount,
  };
});
