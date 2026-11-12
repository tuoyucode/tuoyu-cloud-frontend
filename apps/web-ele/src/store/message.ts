import type { MessageCenterSnapshot } from '@tuoyu/shared/pages/message/message-center';
import type { NotificationHandle } from 'element-plus';

import { computed, shallowRef } from 'vue';

import { useAccessStore, useUserStore } from '@vben/stores';

import {
  createMessageCenter,
  EMPTY_MESSAGE_SNAPSHOT,
  messageCategoryLabel,
} from '@tuoyu/shared/pages/message/message-center';
import { ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

/**
 * 消息中心：打开页面时加载历史消息，之后通过 SSE 接收推送。
 * 连接、合并与已读状态在共享包的 createMessageCenter 中，这里只负责响应式状态与实时提示
 */
export const useMessageStore = defineStore('message', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  const snapshot = shallowRef<MessageCenterSnapshot>(EMPTY_MESSAGE_SNAPSHOT);

  /** 实时提示只保留一条：连续收到多条时关闭上一条，只显示最新的，不会刷屏 */
  let toast: NotificationHandle | undefined;

  const center = createMessageCenter({
    accessToken: () => accessStore.accessToken,
    notify: (item, title) => {
      toast?.close();
      toast = ElNotification({
        duration: 4500,
        message: item.message,
        position: 'top-right',
        title,
      });
    },
    onChange: (next) => {
      snapshot.value = next;
    },
    userId: () => userStore.userInfo?.userId,
  });

  /** 铃铛中显示的消息（去掉已移除的） */
  const messages = computed(() => snapshot.value.messages);
  const unreadCount = computed(() => snapshot.value.unreadCount);

  function isRead(id: string) {
    return snapshot.value.read.has(id);
  }

  return {
    $reset: center.reset,
    categoryLabel: messageCategoryLabel,
    clear: center.clear,
    disconnect: center.disconnect,
    isRead,
    markAllRead: center.markAllRead,
    markRead: center.markRead,
    messages,
    remove: center.remove,
    restart: center.restart,
    start: center.start,
    stop: center.stop,
    unreadCount,
  };
});
