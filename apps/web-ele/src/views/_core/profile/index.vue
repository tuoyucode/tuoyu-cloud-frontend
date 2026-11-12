<script lang="ts" setup>
import type { ProfileApi } from '@tuoyu/shared/api/system/profile';
import type { UploadFile, UploadInstance } from 'element-plus';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { getProfile, uploadAvatar } from '@tuoyu/shared/api/system/profile';
import {
  ElAvatar,
  ElButton,
  ElCard,
  ElMessage,
  ElSkeleton,
  ElTabPane,
  ElTabs,
  ElTag,
  ElUpload,
} from 'element-plus';

import { $t } from '#/locales';

import BaseSetting from './base-setting.vue';
import {
  AVATAR_ACCEPT,
  avatarRejection,
  resolveProfileTab,
  splitGroup,
} from './data';
import OnlineDevices from './online-devices.vue';
import PasswordSetting from './password-setting.vue';
import SocialAccounts from './social-accounts.vue';

defineOptions({ name: 'Profile' });

const loading = ref(true);
const profile = ref<ProfileApi.Profile>();
const route = useRoute();
/** 页签可以用查询参数 tab 指定，例如第三方账号绑定后回到 ?tab=social */
const activeTab = ref<string>(resolveProfileTab(route.query.tab));
watch(
  () => route.query.tab,
  (tab) => {
    if (tab !== undefined) {
      activeTab.value = resolveProfileTab(tab);
    }
  },
);

const user = computed(() => profile.value?.user);
const roles = computed(() => splitGroup(profile.value?.roleGroup));
const posts = computed(() => splitGroup(profile.value?.postGroup));
const avatar = computed(
  () => user.value?.avatarUrl || preferences.app.defaultAvatar,
);

const userStore = useUserStore();
const uploadRef = ref<UploadInstance>();
const avatarUploading = ref(false);

/**
 * 选择头像后先检查类型与大小，不符时提示原因、不上传；通过后自己调用上传接口
 * （ElUpload 不自动上传，也不保留已选的文件）
 */
async function onAvatarChange(file: UploadFile) {
  uploadRef.value?.clearFiles();
  const raw = file.raw;
  if (!raw || avatarUploading.value) {
    return;
  }
  const reason = avatarRejection(raw);
  if (reason) {
    ElMessage.warning($t(reason));
    return;
  }
  avatarUploading.value = true;
  try {
    const { avatarUrl } = await uploadAvatar(raw);
    if (profile.value) {
      profile.value.user.avatarUrl = avatarUrl;
    }
    // 页头的头像同步更新，不必重新加载用户信息
    if (userStore.userInfo) {
      userStore.setUserInfo({ ...userStore.userInfo, avatar: avatarUrl });
    }
    ElMessage.success($t('page.profile.avatarUpdated'));
  } catch {
    // 失败原因由请求层提示（例如服务端校验文件内容不符）
  } finally {
    avatarUploading.value = false;
  }
}

async function loadProfile() {
  try {
    profile.value = await getProfile();
  } finally {
    loading.value = false;
  }
}

onMounted(loadProfile);
</script>

<template>
  <Page>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
      <!-- 本人概况 -->
      <ElCard class="w-full shrink-0 lg:w-80" shadow="never">
        <ElSkeleton :loading="loading" :rows="6" animated>
          <div v-if="user" class="flex flex-col items-center gap-2 pb-4">
            <ElAvatar :size="80" :src="avatar" />
            <ElUpload
              ref="uploadRef"
              :accept="AVATAR_ACCEPT"
              :auto-upload="false"
              :disabled="avatarUploading"
              :on-change="onAvatarChange"
              :show-file-list="false"
            >
              <ElButton :loading="avatarUploading" size="small">
                {{ $t('page.profile.changeAvatar') }}
              </ElButton>
            </ElUpload>
            <div class="text-xs text-muted-foreground">
              {{ $t('page.profile.avatarHint') }}
            </div>
            <div class="text-lg font-semibold break-all">
              {{ user.nickName }}
            </div>
            <div class="font-mono text-sm text-muted-foreground">
              {{ user.userName }}
            </div>
          </div>
          <dl
            v-if="user"
            class="flex flex-col gap-3 border-t border-border pt-4"
          >
            <div class="flex justify-between gap-3 text-sm">
              <dt class="shrink-0 text-muted-foreground">
                {{ $t('page.profile.dept') }}
              </dt>
              <dd class="text-right break-all">{{ user.deptName || '-' }}</dd>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <dt class="shrink-0 text-muted-foreground">
                {{ $t('page.profile.roles') }}
              </dt>
              <dd class="flex flex-wrap justify-end gap-1">
                <ElTag
                  v-for="role in roles"
                  :key="role"
                  disable-transitions
                  type="info"
                >
                  {{ role }}
                </ElTag>
                <span v-if="roles.length === 0">-</span>
              </dd>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <dt class="shrink-0 text-muted-foreground">
                {{ $t('page.profile.posts') }}
              </dt>
              <dd class="flex flex-wrap justify-end gap-1">
                <ElTag
                  v-for="post in posts"
                  :key="post"
                  disable-transitions
                  type="info"
                >
                  {{ post }}
                </ElTag>
                <span v-if="posts.length === 0">-</span>
              </dd>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <dt class="shrink-0 text-muted-foreground">
                {{ $t('page.profile.phoneNumber') }}
              </dt>
              <dd class="text-right break-all">
                {{ user.phoneNumber || '-' }}
              </dd>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <dt class="shrink-0 text-muted-foreground">
                {{ $t('page.profile.email') }}
              </dt>
              <dd class="text-right break-all">{{ user.email || '-' }}</dd>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <dt class="shrink-0 text-muted-foreground">
                {{ $t('page.profile.lastLogin') }}
              </dt>
              <dd class="text-right tabular-nums">
                <div>{{ user.loginDate || '-' }}</div>
                <div
                  v-if="user.loginIp"
                  class="font-mono text-xs text-muted-foreground"
                >
                  {{ user.loginIp }}
                </div>
              </dd>
            </div>
          </dl>
        </ElSkeleton>
      </ElCard>

      <!-- 设置 -->
      <ElCard class="min-w-0 flex-1" shadow="never">
        <ElTabs v-model="activeTab">
          <ElTabPane :label="$t('page.profile.basic')" name="basic">
            <BaseSetting v-if="user" :user="user" @saved="loadProfile" />
          </ElTabPane>
          <ElTabPane :label="$t('page.profile.password')" name="password">
            <PasswordSetting />
          </ElTabPane>
          <ElTabPane :label="$t('page.profile.devices')" name="devices">
            <OnlineDevices v-if="activeTab === 'devices'" />
          </ElTabPane>
          <ElTabPane :label="$t('page.profile.social')" name="social">
            <SocialAccounts v-if="activeTab === 'social'" />
          </ElTabPane>
        </ElTabs>
      </ElCard>
    </div>
  </Page>
</template>
