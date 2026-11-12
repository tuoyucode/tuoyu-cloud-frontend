<script lang="ts" setup>
import type { RoleApi } from '@tuoyu/shared/api/system/role';
import type { UserApi } from '@tuoyu/shared/api/system/user';
import type { TableInstance } from 'element-plus';

import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { DictType } from '@tuoyu/shared/api/system/dict';
import {
  getUserAuthRole,
  updateUserAuthRole,
} from '@tuoyu/shared/api/system/user';
import { useBreakpoints } from '@vueuse/core';
import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElMessage,
  ElTable,
  ElTableColumn,
  vLoading,
} from 'element-plus';

import DictTag from '#/components/dict-tag.vue';
import { $t } from '#/locales';

defineOptions({ name: 'SystemUserAuthRole' });

const route = useRoute();
const router = useRouter();

const userId = computed(() => String(route.params.userId ?? ''));

const loading = ref(false);
const saving = ref(false);
const user = ref<UserApi.User>();
const roles = ref<RoleApi.Role[]>([]);
const selectedRoleIds = ref<string[]>([]);
const tableRef = ref<TableInstance>();

/** 基本信息：窄屏 1 列，中等屏 2 列，宽屏 3 列 */
const breakpoints = useBreakpoints({ md: 768, sm: 576 });
const descriptionColumns = computed(() => {
  if (breakpoints.greaterOrEqual('md').value) {
    return 3;
  }
  return breakpoints.greaterOrEqual('sm').value ? 2 : 1;
});

function onSelectionChange(rows: RoleApi.Role[]) {
  selectedRoleIds.value = rows.map((row) => row.roleId);
}

async function load() {
  if (!userId.value) {
    return;
  }
  loading.value = true;
  try {
    const data = await getUserAuthRole(userId.value);
    user.value = data.user;
    roles.value = data.roles;
    // 表格渲染新数据后再勾选用户已有的角色
    await nextTick();
    tableRef.value?.clearSelection();
    for (const role of data.roles) {
      if (role.flag) {
        tableRef.value?.toggleRowSelection(role, true);
      }
    }
    selectedRoleIds.value = data.roles
      .filter((role) => role.flag)
      .map((role) => role.roleId);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/system/user');
}

/** 不勾选任何角色时提交空数组，表示清空该用户的全部角色 */
async function onSave() {
  saving.value = true;
  try {
    await updateUserAuthRole(userId.value, selectedRoleIds.value);
    ElMessage.success($t('crud.saved'));
    goBack();
  } finally {
    saving.value = false;
  }
}

// 页面被缓存时切换到其他用户也要重新加载
watch(userId, load, { immediate: true });
</script>

<template>
  <Page
    :description="$t('system.user.authRoleDescription')"
    :title="$t('system.user.authRoleTitle')"
  >
    <template #extra>
      <div class="flex gap-2">
        <ElButton @click="goBack">{{ $t('system.user.backToList') }}</ElButton>
        <ElButton
          :disabled="loading"
          :loading="saving"
          type="primary"
          @click="onSave"
        >
          {{ $t('system.user.saveRoles') }}
        </ElButton>
      </div>
    </template>

    <div class="bg-card flex flex-col gap-4 rounded-md p-4">
      <ElDescriptions
        :column="descriptionColumns"
        :title="$t('system.user.basicInfo')"
        size="small"
      >
        <ElDescriptionsItem :label="$t('system.user.nickName')">
          {{ user?.nickName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.user.userName')">
          {{ user?.userName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.user.dept')">
          {{ user?.deptName }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <div class="flex items-center justify-between">
        <span class="font-medium">{{ $t('system.user.roles') }}</span>
        <span class="text-muted-foreground text-sm">
          {{
            $t('system.user.selectedRoles', { count: selectedRoleIds.length })
          }}
        </span>
      </div>
      <ElTable
        ref="tableRef"
        v-loading="loading"
        :data="roles"
        row-key="roleId"
        size="small"
        @selection-change="onSelectionChange"
      >
        <ElTableColumn type="selection" width="48" />
        <ElTableColumn :label="$t('system.role.roleName')" prop="roleName" />
        <ElTableColumn :label="$t('system.role.roleKey')" prop="roleKey" />
        <ElTableColumn :label="$t('crud.status')" prop="status" width="100">
          <template #default="{ row }">
            <DictTag :dict-type="DictType.NORMAL_DISABLE" :value="row.status" />
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('crud.createTime')"
          prop="createTime"
          width="180"
        />
      </ElTable>
    </div>
  </Page>
</template>
