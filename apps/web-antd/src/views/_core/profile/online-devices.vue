<script lang="ts" setup>
import type { OnlineApi } from '#/api/monitor/online';

import { onMounted, ref } from 'vue';

import { formatDateTime } from '@vben/utils';

import {
  Button,
  Empty,
  message,
  Popconfirm,
  Skeleton,
  Tag,
} from 'ant-design-vue';

import { listMyOnline, logoutMyOnline } from '#/api/monitor/online';
import { DictType } from '#/api/system/dict';
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
  message.success($t('page.profile.deviceLoggedOut'));
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.profile.devicesDesc') }}
    </p>
    <Skeleton :loading="loading" active>
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
              <Tag v-if="device.current" :bordered="false" color="processing">
                {{ $t('page.profile.currentDevice') }}
              </Tag>
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
          <Popconfirm
            v-if="!device.current"
            :description="$t('page.profile.logoutDeviceDesc')"
            :ok-button-props="{ danger: true }"
            :ok-text="$t('page.profile.logoutDevice')"
            :title="$t('page.profile.confirmLogoutDevice')"
            placement="left"
            @confirm="onLogout(device)"
          >
            <Button danger size="small">
              {{ $t('page.profile.logoutDevice') }}
            </Button>
          </Popconfirm>
        </div>
      </div>
      <Empty v-else :description="$t('page.profile.noDevices')" />
    </Skeleton>
  </div>
</template>
