<script lang="ts" setup>
import type { MessageFilter } from '@tuoyu/shared/pages/message/message-center';
import type { MessageItem } from '@tuoyu/shared/utils/message-box';

import type { NotificationItem } from '@vben/layouts';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VbenIconButton } from '@vben/common-ui';
import { CircleCheckBig, CircleX, IconifyIcon } from '@vben/icons';
import { Notification } from '@vben/layouts';
import { useAccessStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';

import {
  canOpenMessagePath,
  MESSAGE_CATEGORY_ICONS as CATEGORY_ICONS,
  filterMessages,
  messageFilterOptions,
} from '@tuoyu/shared/pages/message/message-center';
import { ElButton, ElDialog, ElEmpty, ElSegmented } from 'element-plus';

import { $t } from '#/locales';
import { useMessageStore } from '#/store';

/**
 * 页头的消息铃铛：历史消息 + 实时推送。
 * 点击消息：工作流消息直接打开相关页面，其他消息显示详情（正文按纯文本显示）
 */
defineOptions({ name: 'MessageCenter' });

const router = useRouter();
const accessStore = useAccessStore();
const messageStore = useMessageStore();

/** 正在查看详情的消息 */
const detail = ref<MessageItem>();
/** “查看全部”弹窗 */
const listOpen = ref(false);
const listFilter = ref<MessageFilter>('all');

const byId = computed(
  () => new Map(messageStore.messages.map((item) => [item.id, item])),
);

const notificationItems = computed<NotificationItem[]>(() =>
  messageStore.messages.map((item) => ({
    avatar: '',
    date: formatDateTime(item.time),
    id: item.id,
    isRead: messageStore.isRead(item.id),
    message: item.message,
    title: messageStore.categoryLabel(item),
  })),
);

const filterOptions = computed(() => messageFilterOptions());

const filteredMessages = computed(() =>
  filterMessages(messageStore.messages, listFilter.value),
);

/** 消息中的路径是否对应当前用户可以访问的页面（没有菜单权限时路由不存在） */
function canOpen(path?: string): path is string {
  return canOpenMessagePath(router, path);
}

function openPath(path: string) {
  detail.value = undefined;
  listOpen.value = false;
  router.push(path);
}

function openMessage(item: MessageItem) {
  messageStore.markRead(item.id);
  if (item.category === 'workflow' && canOpen(item.path)) {
    openPath(item.path);
    return;
  }
  detail.value = item;
}

/** 详情弹窗关闭（点关闭按钮、遮罩或按 Esc） */
function onDetailOpenChange(open: boolean) {
  if (!open) {
    detail.value = undefined;
  }
}

function onNotificationClick(entry: NotificationItem) {
  const item = byId.value.get(String(entry.id));
  if (item) {
    openMessage(item);
  }
}

function iconOf(id: number | string) {
  const item = byId.value.get(String(id));
  return CATEGORY_ICONS[item?.category ?? 'system'];
}

// 登录失效时停止；重新登录（令牌变化）后用新令牌重新连接
watch(
  () => accessStore.accessToken,
  (token, previous) => {
    if (!token) {
      messageStore.stop();
    } else if (token !== previous) {
      messageStore.restart();
    }
  },
);

onMounted(() => messageStore.start());
onBeforeUnmount(() => messageStore.stop());
</script>

<template>
  <Notification
    :dot="messageStore.unreadCount > 0"
    :notifications="notificationItems"
    @clear="messageStore.clear()"
    @make-all="messageStore.markAllRead()"
    @on-click="onNotificationClick"
    @read="(item) => messageStore.markRead(String(item.id))"
    @remove="(item) => messageStore.remove(String(item.id))"
    @view-all="listOpen = true"
  >
    <template #content="{ item }">
      <span
        v-if="!item.isRead"
        class="absolute top-2 right-2 size-2 rounded-sm bg-primary"
      ></span>
      <span
        class="flex-center size-9 shrink-0 rounded-full bg-primary/10 text-primary"
      >
        <IconifyIcon :icon="iconOf(item.id)" class="size-4" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-1 pr-8 leading-none">
        <p class="font-semibold">{{ item.title }}</p>
        <p
          class="my-1 line-clamp-2 text-xs break-all whitespace-pre-wrap text-muted-foreground"
        >
          {{ item.message }}
        </p>
        <p class="text-xs text-muted-foreground">{{ item.date }}</p>
      </div>
      <div
        class="absolute top-1/2 right-3 flex -translate-y-1/2 flex-row gap-1"
      >
        <VbenIconButton
          v-if="!item.isRead"
          :tooltip="$t('page.message.markRead')"
          class="h-6 px-2"
          size="xs"
          variant="ghost"
          @click.stop="messageStore.markRead(String(item.id))"
        >
          <CircleCheckBig class="size-4" />
        </VbenIconButton>
        <VbenIconButton
          v-else
          :tooltip="$t('page.message.remove')"
          class="h-6 px-2 text-destructive"
          size="xs"
          variant="ghost"
          @click.stop="messageStore.remove(String(item.id))"
        >
          <CircleX class="size-4" />
        </VbenIconButton>
      </div>
    </template>
  </Notification>

  <!-- 全部消息 -->
  <ElDialog
    v-model="listOpen"
    :title="$t('page.message.title')"
    append-to-body
    width="720px"
  >
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <ElSegmented v-model="listFilter" :options="filterOptions" />
      <ElButton
        :disabled="messageStore.unreadCount === 0"
        size="small"
        @click="messageStore.markAllRead()"
      >
        {{ $t('page.message.markAllRead') }}
      </ElButton>
    </div>
    <div
      v-if="filteredMessages.length > 0"
      class="max-h-[60vh] divide-y divide-border overflow-y-auto"
    >
      <button
        v-for="item in filteredMessages"
        :key="item.id"
        class="flex w-full items-start gap-3 px-1 py-3 text-left hover:bg-accent"
        type="button"
        @click="openMessage(item)"
      >
        <span
          class="flex-center mt-0.5 size-8 shrink-0 rounded-full bg-primary/10 text-primary"
        >
          <IconifyIcon :icon="CATEGORY_ICONS[item.category]" class="size-4" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="flex items-center gap-2">
            <span
              :class="messageStore.isRead(item.id) ? '' : 'font-semibold'"
              class="text-sm"
            >
              {{ messageStore.categoryLabel(item) }}
            </span>
            <span
              v-if="!messageStore.isRead(item.id)"
              class="size-2 rounded-sm bg-primary"
            ></span>
            <span class="ml-auto text-xs text-muted-foreground tabular-nums">
              {{ formatDateTime(item.time) }}
            </span>
          </span>
          <span
            class="line-clamp-2 text-[13px] break-all whitespace-pre-wrap text-muted-foreground"
          >
            {{ item.message }}
          </span>
        </span>
      </button>
    </div>
    <ElEmpty v-else :description="$t('page.message.empty')" />
  </ElDialog>

  <!-- 消息详情：内容一律按纯文本显示 -->
  <ElDialog
    :model-value="!!detail"
    :title="detail ? messageStore.categoryLabel(detail) : ''"
    append-to-body
    width="560px"
    @update:model-value="onDetailOpenChange"
  >
    <template v-if="detail">
      <div class="mb-3 text-xs text-muted-foreground tabular-nums">
        {{ formatDateTime(detail.time) }}
      </div>
      <p class="text-sm break-all whitespace-pre-wrap">{{ detail.message }}</p>
      <div
        v-if="detail.content"
        class="mt-3 max-h-[50vh] overflow-y-auto rounded-md bg-muted p-3 text-sm break-all whitespace-pre-wrap"
      >
        {{ detail.content }}
      </div>
    </template>
    <template #footer>
      <ElButton @click="detail = undefined">
        {{ $t('page.message.close') }}
      </ElButton>
      <ElButton
        v-if="detail && canOpen(detail.path)"
        type="primary"
        @click="openPath(detail.path as string)"
      >
        {{ $t('page.message.open') }}
      </ElButton>
    </template>
  </ElDialog>
</template>
