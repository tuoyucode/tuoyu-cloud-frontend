<script lang="ts" setup>
import type { ProfileApi } from '#/api/system/profile';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { preferences } from '@vben/preferences';

import { Avatar, Card, Skeleton, TabPane, Tabs, Tag } from 'ant-design-vue';

import { getProfile } from '#/api/system/profile';
import { $t } from '#/locales';

import BaseSetting from './base-setting.vue';
import { resolveProfileTab, splitGroup } from './data';
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
