<script lang="ts" setup>
import type { TenantApi } from '#/api/system/tenant';

import { computed, onMounted, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { Button, message, Select, Tag, Tooltip } from 'ant-design-vue';

import {
  clearTenantSwitch,
  DEFAULT_TENANT_ID,
  getCurrentTenant,
  listTenant,
  switchTenant,
} from '#/api/system/tenant';
import { isSuperAdminUser } from '#/api/system/user';
import { $t } from '#/locales';

/** 下拉中最多列出的租户数（后端分页上限 500） */
const MAX_TENANTS = 500;

const userStore = useUserStore();

/** 当前所在的租户；关闭多租户或不是超级管理员时为空，组件不显示 */
const current = ref<TenantApi.CurrentTenant>();
const tenants = ref<TenantApi.Tenant[]>([]);
const loading = ref(false);
const busy = ref(false);

/** 与后端一致：只有超级管理员（按用户 ID 判断）可以切换租户 */
const isSuperAdmin = computed(() =>
  isSuperAdminUser(userStore.userInfo?.userId),
);

const visible = computed(() => isSuperAdmin.value && current.value?.enabled);

const options = computed(() =>
  tenants.value.map((tenant) => ({
    label: `${tenant.tenantName}（${tenant.tenantId}）`,
    value: tenant.tenantId,
  })),
);

const currentName = computed(() => {
  const tenantId = current.value?.tenantId ?? '';
  return (
    tenants.value.find((tenant) => tenant.tenantId === tenantId)?.tenantName ??
    tenantId
  );
});

async function load() {
  if (!isSuperAdmin.value) {
    return;
  }
  try {
    current.value = await getCurrentTenant();
  } catch {
    return;
  }
  if (current.value.enabled) {
    await loadTenants();
  }
}

async function loadTenants() {
  loading.value = true;
  try {
    const page = await listTenant({ page: 1, pageSize: MAX_TENANTS });
    tenants.value = page.items;
  } catch {
    // 没有租户查询权限时只显示当前租户与“退出租户”
  } finally {
    loading.value = false;
  }
}

/** 切换后重新加载页面：菜单、路由与页面数据都按新的租户重新获取 */
function reloadPage() {
  window.location.reload();
}

async function onSelect(value: unknown) {
  const tenantId = String(value);
  if (!current.value || tenantId === current.value.tenantId) {
    return;
  }
  busy.value = true;
  try {
    // 选回默认租户（平台）等同于退出切换
    await (tenantId === DEFAULT_TENANT_ID
      ? clearTenantSwitch()
      : switchTenant(tenantId));
    message.success($t('system.tenant.switcher.switched'));
    reloadPage();
  } finally {
    busy.value = false;
  }
}

async function onExit() {
  busy.value = true;
  try {
    await clearTenantSwitch();
    message.success($t('system.tenant.switcher.exited'));
    reloadPage();
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div v-if="visible" class="mr-2 flex items-center gap-2">
    <Tooltip
      v-if="current?.switched"
      :title="$t('system.tenant.switcher.insideTip')"
    >
      <Tag class="m-0" color="warning">
        {{ $t('system.tenant.switcher.inside', { name: currentName }) }}
      </Tag>
    </Tooltip>
    <Select
      :aria-label="$t('system.tenant.switcher.label')"
      :disabled="busy"
      :loading="loading"
      :options="options"
      :placeholder="$t('system.tenant.switcher.placeholder')"
      :value="current?.switched ? (current?.tenantId ?? undefined) : undefined"
      class="w-44"
      option-filter-prop="label"
      show-search
      size="small"
      @change="onSelect"
    />
    <Button
      v-if="current?.switched"
      :loading="busy"
      danger
      size="small"
      @click="onExit"
    >
      {{ $t('system.tenant.switcher.exit') }}
    </Button>
  </div>
</template>
