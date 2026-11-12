<script lang="ts" setup>
import type { OnlineApi } from '@tuoyu/shared/api/monitor/online';

import { onMounted, ref } from 'vue';

import { formatDateTime } from '@vben/utils';

import { listMyOnline, logoutMyOnline } from '@tuoyu/shared/api/monitor/online';
import { DictType } from '@tuoyu/shared/api/system/dict';
import {
  ElButton,
  ElEmpty,
  ElMessage,
  ElPopconfirm,
  ElSkeleton,
  ElTag,
} from 'element-plus';

import DictTag from '#/components/dict-tag.vue';
import { $t } from '#/locales';

import { sortDevices } from './data';

const loading = ref(true);
const devices = ref<OnlineApi.Online[]>([]);

async function load() {
  loading.value = true;
  try {
    devices.value = sortDevices(await listMyOnline());
  } finally {
    loading.value = false;
  }
}

async function onLogout(device: OnlineApi.Online) {
  await logoutMyOnline(device.sessionId);
  ElMessage.success($t('page.profile.deviceLoggedOut'));
  await load();
}

/** 气泡确认没有单独的说明区域，说明接在问题后面 */
function confirmTitle() {
  return `${$t('page.profile.confirmLogoutDevice')} ${$t('page.profile.logoutDeviceDesc')}`;
}

onMounted(load);
</script>

<template>
  <div>
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.profile.devicesDesc') }}
    </p>
    <ElSkeleton :loading="loading" :rows="4" animated>
      <div v-if="devices.length > 0" class="divide-y divide-border">
        <div
          v-for="device in devices"
          :key="device.sessionId"
          class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">
                {{ device.browser || '-' }} · {{ device.os || '-' }}
              </span>
              <DictTag
                v-if="device.deviceType"
                :dict-type="DictType.DEVICE_TYPE"
                :value="device.deviceType"
              />
              <ElTag v-if="device.current" disable-transitions type="primary">
                {{ $t('page.profile.currentDevice') }}
              </ElTag>
            </div>
            <div
              class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
            >
              <span>
                {{ $t('page.profile.ipaddr') }}
                <span class="font-mono">{{ device.ipaddr || '-' }}</span>
              </span>
              <span v-if="device.loginLocation">
                {{ $t('page.profile.loginLocation') }}
                {{ device.loginLocation }}
              </span>
              <span class="tabular-nums">
                {{ $t('page.profile.loginTime') }}
                {{
                  device.loginTime
                    ? formatDateTime(Number(device.loginTime))
                    : '-'
                }}
              </span>
            </div>
          </div>
          <!-- 当前设备不能在这里下线（退出登录请用头像菜单） -->
          <ElPopconfirm
            v-if="!device.current"
            :cancel-button-text="$t('common.cancel')"
            :confirm-button-text="$t('page.profile.logoutDevice')"
            :title="confirmTitle()"
            confirm-button-type="danger"
            placement="left"
            width="280"
            @confirm="onLogout(device)"
          >
            <template #reference>
              <ElButton plain size="small" type="danger">
                {{ $t('page.profile.logoutDevice') }}
              </ElButton>
            </template>
          </ElPopconfirm>
        </div>
      </div>
      <ElEmpty v-else :description="$t('page.profile.noDevices')" />
    </ElSkeleton>
  </div>
</template>
