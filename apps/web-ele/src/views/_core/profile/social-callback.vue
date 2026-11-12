<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { bindSocial } from '@tuoyu/shared/api/system/social';
import { errorMessageOf } from '@tuoyu/shared/utils/api-result';
import { ElButton, ElMessage, ElResult } from 'element-plus';

import { $t } from '#/locales';

import { parseSocialCallback, socialPlatformName } from './data';

/**
 * 第三方授权回跳页：把第三方账号绑定到当前用户，成功后回到个人中心的第三方账号页签。
 * 授权码只能使用一次，失败后需要回到个人中心重新绑定
 */
defineOptions({ name: 'SocialCallback' });

const route = useRoute();
const router = useRouter();

const form = parseSocialCallback(route.query);
const binding = ref(form !== null);
const error = ref(form === null ? $t('page.profile.callbackMissing') : '');

const platform = computed(() => (form ? socialPlatformName(form.source) : ''));

function backToProfile() {
  router.replace({ name: 'Profile', query: { tab: 'social' } });
}

/** 后端返回的失败原因（请求层已经弹出提示，这里同时显示在页面上） */
function errorMessage(reason: unknown): string {
  return errorMessageOf(reason, $t('page.profile.bindFailedDesc'));
}

onMounted(async () => {
  if (!form) {
    return;
  }
  try {
    await bindSocial(form);
    ElMessage.success($t('page.profile.bindSucceeded'));
    backToProfile();
  } catch (error_) {
    error.value = errorMessage(error_);
    binding.value = false;
  }
});
</script>

<template>
  <Page>
    <div
      class="bg-card flex min-h-80 items-center justify-center rounded-md p-4"
    >
      <div v-if="binding" class="flex flex-col items-center gap-4">
        <!-- Element Plus 的 v-loading 指令（bootstrap 中注册），只用来显示加载动画 -->
        <div
          v-loading="true"
          class="size-16"
          element-loading-background="transparent"
        ></div>
        <span class="text-muted-foreground">
          {{ $t('page.profile.binding', { platform }) }}
        </span>
      </div>
      <ElResult
        v-else
        :sub-title="error"
        :title="$t('page.profile.bindFailed')"
        icon="error"
      >
        <template #extra>
          <ElButton type="primary" @click="backToProfile">
            {{ $t('page.profile.backToProfile') }}
          </ElButton>
        </template>
      </ElResult>
    </div>
  </Page>
</template>
