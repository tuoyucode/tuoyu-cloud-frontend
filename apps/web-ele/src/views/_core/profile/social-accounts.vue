<script lang="ts" setup>
import type { SocialApi } from '@tuoyu/shared/api/system/social';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  getSocialAuthorizeUrl,
  listMySocial,
  listSocialSources,
  unbindSocial,
} from '@tuoyu/shared/api/system/social';
import {
  ElButton,
  ElEmpty,
  ElMessage,
  ElPopconfirm,
  ElSkeleton,
} from 'element-plus';

import { $t } from '#/locales';

import { isAuthorizeUrl, socialPlatformName, unboundSources } from './data';

/**
 * 本人绑定的第三方账号：列表、解除绑定，以及已配置但尚未绑定的平台的绑定入口。
 * 绑定时跳转到第三方授权页，授权后回到 /social-callback 完成绑定
 */
const loading = ref(true);
const accounts = ref<SocialApi.Social[]>([]);
/** 已配置的平台编码；读取失败时按没有配置处理（请求层已提示原因） */
const sources = ref<string[]>([]);
/** 正在跳转授权页的平台 */
const redirecting = ref<string>();

const available = computed(() => unboundSources(sources.value, accounts.value));

async function loadSources(): Promise<string[]> {
  try {
    return (await listSocialSources()) ?? [];
  } catch {
    return [];
  }
}

async function load() {
  loading.value = true;
  try {
    const [mine, configured] = await Promise.all([
      listMySocial(),
      loadSources(),
    ]);
    accounts.value = mine ?? [];
    sources.value = configured;
  } finally {
    loading.value = false;
  }
}

/** 气泡确认没有单独的说明区域，说明接在问题后面 */
function unbindTitle(account: SocialApi.Social) {
  const source = socialPlatformName(account.source);
  return `${$t('page.profile.confirmUnbind', { source })} ${$t('page.profile.unbindDesc')}`;
}

async function onUnbind(account: SocialApi.Social) {
  await unbindSocial(String(account.id));
  ElMessage.success($t('page.profile.unbound'));
  await load();
}

async function onBind(source: string) {
  redirecting.value = source;
  try {
    const url = await getSocialAuthorizeUrl(source);
    if (!isAuthorizeUrl(url)) {
      ElMessage.error($t('page.profile.authorizeUrlInvalid'));
      redirecting.value = undefined;
      return;
    }
    // 跳转期间保持加载状态，避免重复点击
    window.location.href = url;
  } catch {
    // 平台未配置等原因由请求层提示
    redirecting.value = undefined;
  }
}

/** 从授权页按“后退”回来时页面可能来自浏览器缓存，恢复按钮状态 */
function onPageShow(event: PageTransitionEvent) {
  if (event.persisted) {
    redirecting.value = undefined;
  }
}

onMounted(() => {
  window.addEventListener('pageshow', onPageShow);
  load();
});

onBeforeUnmount(() => {
  window.removeEventListener('pageshow', onPageShow);
});
</script>

<template>
  <div>
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.profile.socialDesc') }}
    </p>
    <ElSkeleton :loading="loading" :rows="4" animated>
      <div v-if="accounts.length > 0" class="divide-y divide-border">
        <div
          v-for="account in accounts"
          :key="account.id"
          class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">
                {{ socialPlatformName(account.source) }}
              </span>
              <span class="break-all">
                {{ account.nickName || account.userName || '-' }}
              </span>
            </div>
            <div
              class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
            >
              <span v-if="account.userName">
                {{ $t('page.profile.socialAccount') }} {{ account.userName }}
              </span>
              <span v-if="account.createTime" class="tabular-nums">
                {{ $t('page.profile.bindTime') }} {{ account.createTime }}
              </span>
            </div>
          </div>
          <ElPopconfirm
            :cancel-button-text="$t('common.cancel')"
            :confirm-button-text="$t('page.profile.unbind')"
            :title="unbindTitle(account)"
            confirm-button-type="danger"
            placement="left"
            width="280"
            @confirm="onUnbind(account)"
          >
            <template #reference>
              <ElButton plain size="small" type="danger">
                {{ $t('page.profile.unbind') }}
              </ElButton>
            </template>
          </ElPopconfirm>
        </div>
      </div>
      <ElEmpty v-else :description="$t('page.profile.noSocial')" />

      <!-- 已配置但尚未绑定的平台 -->
      <div class="mt-6 border-t border-border pt-4">
        <div class="mb-2 font-medium">
          {{ $t('page.profile.socialAvailable') }}
        </div>
        <p v-if="sources.length === 0" class="text-sm text-muted-foreground">
          {{ $t('page.profile.socialNotConfigured') }}
        </p>
        <p
          v-else-if="available.length === 0"
          class="text-sm text-muted-foreground"
        >
          {{ $t('page.profile.socialAllBound') }}
        </p>
        <div v-else class="divide-y divide-border">
          <div
            v-for="source in available"
            :key="source"
            class="flex items-center gap-2 py-3"
          >
            <span class="min-w-0 flex-1 font-medium break-all">
              {{ socialPlatformName(source) }}
            </span>
            <ElButton
              :disabled="redirecting !== undefined && redirecting !== source"
              :loading="redirecting === source"
              size="small"
              type="primary"
              @click="onBind(source)"
            >
              {{ $t('page.profile.bind') }}
            </ElButton>
          </div>
        </div>
      </div>
    </ElSkeleton>
  </div>
</template>
