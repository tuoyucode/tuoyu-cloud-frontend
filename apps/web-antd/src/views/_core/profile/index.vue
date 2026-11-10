<script lang="ts" setup>
import type { ProfileApi } from '@tuoyu/shared/api/system/profile';
import type { UploadProps } from 'ant-design-vue';
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { getProfile, uploadAvatar } from '@tuoyu/shared/api/system/profile';
import {
  Avatar,
  Button,
  Card,
  message,
  Skeleton,
  TabPane,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';

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
const avatarUploading = ref(false);

/** 选择头像后先检查类型与大小，不符时提示原因、不上传 */
const beforeAvatarUpload: UploadProps['beforeUpload'] = (file) => {
  const reason = avatarRejection(file);
  if (reason) {
    message.warning($t(reason));
    return Upload.LIST_IGNORE;
  }
  return true;
};

async function onAvatarUpload(options: UploadRequestOption) {
  avatarUploading.value = true;
  try {
    // 失败原因由请求层提示（例如服务端校验文件内容不符）
    const { avatarUrl } = await uploadAvatar(options.file as File);
    if (profile.value) {
      profile.value.user.avatarUrl = avatarUrl;
    }
    // 页头的头像同步更新，不必重新加载用户信息
    if (userStore.userInfo) {
      userStore.setUserInfo({ ...userStore.userInfo, avatar: avatarUrl });
    }
    message.success($t('page.profile.avatarUpdated'));
    options.onSuccess?.({ avatarUrl });
  } catch (error) {
    options.onError?.(error as Error);
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
      <Card class="w-full shrink-0 lg:w-80">
        <Skeleton :loading="loading" active avatar>
          <div v-if="user" class="flex flex-col items-center gap-2 pb-4">
            <Avatar :size="80" :src="avatar" />
            <Upload
              :accept="AVATAR_ACCEPT"
              :before-upload="beforeAvatarUpload"
              :custom-request="onAvatarUpload"
              :show-upload-list="false"
            >
              <Button :loading="avatarUploading" size="small">
                {{ $t('page.profile.changeAvatar') }}
              </Button>
            </Upload>
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
                <Tag
                  v-for="role in roles"
                  :key="role"
                  :bordered="false"
                  class="me-0"
                >
                  {{ role }}
                </Tag>
                <span v-if="roles.length === 0">-</span>
              </dd>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <dt class="shrink-0 text-muted-foreground">
                {{ $t('page.profile.posts') }}
              </dt>
              <dd class="flex flex-wrap justify-end gap-1">
                <Tag
                  v-for="post in posts"
                  :key="post"
                  :bordered="false"
                  class="me-0"
                >
                  {{ post }}
                </Tag>
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
        </Skeleton>
      </Card>

      <!-- 设置 -->
      <Card class="min-w-0 flex-1">
        <Tabs v-model:active-key="activeTab">
          <TabPane key="basic" :tab="$t('page.profile.basic')">
            <BaseSetting v-if="user" :user="user" @saved="loadProfile" />
          </TabPane>
          <TabPane key="password" :tab="$t('page.profile.password')">
            <PasswordSetting />
          </TabPane>
          <TabPane key="devices" :tab="$t('page.profile.devices')">
            <OnlineDevices v-if="activeTab === 'devices'" />
          </TabPane>
          <TabPane key="social" :tab="$t('page.profile.social')">
            <SocialAccounts v-if="activeTab === 'social'" />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  </Page>
</template>
