<script lang="ts" setup>
import type { RoleApi } from '@tuoyu/shared/api/system/role';
import type { UserApi } from '@tuoyu/shared/api/system/user';
import type { TableColumnsType } from 'ant-design-vue';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { DictType } from '@tuoyu/shared/api/system/dict';
import {
  getUserAuthRole,
  updateUserAuthRole,
} from '@tuoyu/shared/api/system/user';
import { Button, Descriptions, message, Table } from 'ant-design-vue';

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

const columns = computed<TableColumnsType<RoleApi.Role>>(() => [
  { dataIndex: 'roleName', title: $t('system.role.roleName') },
  { dataIndex: 'roleKey', title: $t('system.role.roleKey') },
  { dataIndex: 'status', key: 'status', title: $t('crud.status'), width: 100 },
  { dataIndex: 'createTime', title: $t('crud.createTime'), width: 180 },
]);

const rowSelection = computed(() => ({
  onChange: (keys: (number | string)[]) => {
    selectedRoleIds.value = keys.map(String);
  },
  selectedRowKeys: selectedRoleIds.value,
}));

async function load() {
  if (!userId.value) {
    return;
  }
  loading.value = true;
  try {
    const data = await getUserAuthRole(userId.value);
    user.value = data.user;
    roles.value = data.roles;
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
    message.success($t('crud.saved'));
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
        <Button @click="goBack">{{ $t('system.user.backToList') }}</Button>
        <Button
          :disabled="loading"
          :loading="saving"
          type="primary"
          @click="onSave"
        >
          {{ $t('system.user.saveRoles') }}
        </Button>
      </div>
    </template>

    <div class="bg-card flex flex-col gap-4 rounded-md p-4">
      <Descriptions
        :column="{ xs: 1, sm: 2, md: 3 }"
        :title="$t('system.user.basicInfo')"
        size="small"
      >
        <Descriptions.Item :label="$t('system.user.nickName')">
          {{ user?.nickName }}
        </Descriptions.Item>
        <Descriptions.Item :label="$t('system.user.userName')">
          {{ user?.userName }}
        </Descriptions.Item>
        <Descriptions.Item :label="$t('system.user.dept')">
          {{ user?.deptName }}
        </Descriptions.Item>
      </Descriptions>

      <div class="flex items-center justify-between">
        <span class="font-medium">{{ $t('system.user.roles') }}</span>
        <span class="text-muted-foreground text-sm">
          {{
            $t('system.user.selectedRoles', { count: selectedRoleIds.length })
          }}
        </span>
      </div>
      <Table
        :columns="columns"
        :data-source="roles"
        :loading="loading"
        :pagination="false"
        :row-selection="rowSelection"
        row-key="roleId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <DictTag
            v-if="column.key === 'status'"
            :dict-type="DictType.NORMAL_DISABLE"
            :value="record.status"
          />
        </template>
      </Table>
    </div>
  </Page>
</template>
