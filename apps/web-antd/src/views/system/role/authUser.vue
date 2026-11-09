<script lang="ts" setup>
import type { RoleApi } from '@tuoyu/shared/api/system/role';
import type { UserApi } from '@tuoyu/shared/api/system/user';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  cancelRoleUser,
  cancelRoleUsers,
  getRole,
  listAllocatedUser,
} from '@tuoyu/shared/api/system/role';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { Button, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { useUserColumns, useUserSearchSchema } from './data';
import RoleUserSelectModal from './role-user-select-modal.vue';

defineOptions({ name: 'SystemRoleAuthUser' });

const route = useRoute();
const router = useRouter();

const roleId = computed(() => String(route.params.roleId ?? ''));
const role = ref<RoleApi.Role>();

const [SelectModal, selectModalApi] = useVbenModal({
  connectedComponent: RoleUserSelectModal,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“取消所选授权” */
const selectedCount = ref(0);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useUserSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useUserColumns(true),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          if (!roleId.value) {
            return { items: [], total: 0 };
          }
          return await listAllocatedUser({
            ...toPageQuery(page),
            ...formValues,
            roleId: roleId.value,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'userId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<UserApi.User>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

/** 角色名称用于标题；没有角色查询权限时只显示列表 */
async function loadRole() {
  role.value = undefined;
  if (!roleId.value) {
    return;
  }
  try {
    role.value = await getRole(roleId.value);
  } catch {
    role.value = undefined;
  }
}

/** 列表当前对应的角色；首次由表格自动加载 */
let loadedRoleId = roleId.value;

// 页面被缓存时切换到其他角色也要重新加载
watch(
  roleId,
  (value) => {
    if (!value) {
      return;
    }
    loadRole();
    if (value !== loadedRoleId) {
      loadedRoleId = value;
      gridApi.reload();
    }
  },
  { immediate: true },
);

function goBack() {
  router.push('/system/role');
}

function onAddUsers() {
  selectModalApi
    .setData({
      roleId: roleId.value,
      roleName: role.value?.roleName ?? '',
    })
    .open();
}

async function onCancel(row: UserApi.User) {
  await cancelRoleUser(roleId.value, row.userId);
  message.success($t('system.role.authCancelled'));
  reload();
}

function onBatchCancel() {
  const rows = gridApi.grid.getCheckboxRecords() as UserApi.User[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('system.role.confirmBatchCancelAuth', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('system.role.batchCancelAuth'),
    async onOk() {
      await cancelRoleUsers(
        roleId.value,
        rows.map((row) => row.userId),
      );
      message.success($t('system.role.authCancelled'));
      reload();
    },
  });
}
</script>

<template>
  <Page
    :description="
      role
        ? $t('system.role.authUserDescription', {
            key: role.roleKey,
            name: role.roleName,
          })
        : undefined
    "
    :title="$t('system.role.authUser')"
    auto-content-height
  >
    <template #extra>
      <Button @click="goBack">{{ $t('system.role.backToList') }}</Button>
    </template>

    <SelectModal @success="reload" />
    <Grid :table-title="$t('system.role.allocatedUsers')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button type="primary" @click="onAddUsers">
            {{ $t('system.role.addUsers') }}
          </Button>
          <Button :disabled="selectedCount === 0" danger @click="onBatchCancel">
            {{ $t('system.role.batchCancelAuth') }}
          </Button>
        </div>
      </template>

      <template #actions="{ row }">
        <Popconfirm
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.role.cancelAuth')"
          :title="$t('system.role.confirmCancelAuth', { name: row.nickName })"
          placement="left"
          @confirm="onCancel(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('system.role.cancelAuth') }}
          </Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
