<script lang="ts" setup>
import type { UserApi } from '@tuoyu/shared/api/system/user';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  changeUserStatus,
  exportUser,
  isSuperAdminUser,
  listUser,
  removeUser,
  unlockUser,
} from '@tuoyu/shared/api/system/user';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { searchFieldMappingTime, useColumns, useSearchSchema } from './data';
import DeptTree from './dept-tree.vue';
import UserDrawer from './user-drawer.vue';
import UserImportModal from './user-import-modal.vue';
import UserResetPasswordModal from './user-reset-password-modal.vue';

defineOptions({ name: 'SystemUser' });

/** 字典 sys_normal_disable：0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const router = useRouter();

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: UserDrawer,
  destroyOnClose: true,
});

const [ImportModal, importModalApi] = useVbenModal({
  connectedComponent: UserImportModal,
  destroyOnClose: true,
});

const [ResetPasswordModal, resetPasswordModalApi] = useVbenModal({
  connectedComponent: UserResetPasswordModal,
  destroyOnClose: true,
});

/** 左侧部门树选中的部门（含下级部门） */
const deptId = ref<string>();

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    fieldMappingTime: searchFieldMappingTime,
    schema: useSearchSchema(),
    showCollapseButton: true,
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: {
      checkMethod: ({ row }) => !isSuperAdminUser(row.userId),
      highlight: true,
    },
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listUser({
            ...toPageQuery(page),
            ...formValues,
            deptId: deptId.value,
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

/** 切换部门后回到第一页 */
function onDeptChange() {
  gridApi.reload();
}

function onCreate() {
  drawerApi.setData({ deptId: deptId.value }).open();
}

function onEdit(row: UserApi.User) {
  drawerApi.setData({ userId: row.userId }).open();
}

async function onDelete(row: UserApi.User) {
  await removeUser([row.userId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as UserApi.User[];
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('crud.confirmBatchDelete', { count: rows.length }),
      $t('crud.batchDelete'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonClass: 'el-button--danger',
        confirmButtonText: $t('crud.batchDelete'),
        type: 'warning',
      },
    );
  } catch {
    // 取消
    return;
  }
  await removeUser(rows.map((row) => row.userId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onStatusChange(row: UserApi.User, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.userId);
  try {
    await changeUserStatus(row.userId, status);
    row.status = status;
    ElMessage.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.nickName,
      }),
    );
  } finally {
    switching.value.delete(row.userId);
  }
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('system.user.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportUser({ ...query, deptId: deptId.value }, fileName);
}

function onImport() {
  importModalApi.open();
}

/** “更多”菜单中的操作 */
function onMoreAction(row: UserApi.User, key: string) {
  switch (key) {
    case 'authRole': {
      router.push(`/system/user-auth/role/${row.userId}`);
      break;
    }
    case 'resetPassword': {
      resetPasswordModalApi
        .setData({
          nickName: row.nickName,
          userId: row.userId,
          userName: row.userName,
        })
        .open();
      break;
    }
    case 'unlock': {
      onUnlock(row);
      break;
    }
  }
}

async function onUnlock(row: UserApi.User) {
  try {
    await ElMessageBox.confirm(
      $t('system.user.confirmUnlock', { name: row.nickName }),
      $t('system.user.unlock'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('system.user.unlock'),
        type: 'warning',
      },
    );
  } catch {
    // 取消
    return;
  }
  await unlockUser(row.userId);
  ElMessage.success($t('system.user.unlocked', { name: row.nickName }));
}

/** 行内“更多”菜单中当前用户有权限的操作 */
const moreActions = computed(() => {
  const actions: { key: string; label: string }[] = [];
  if (hasPermission('system:user:resetPwd')) {
    actions.push({
      key: 'resetPassword',
      label: $t('system.user.resetPassword'),
    });
  }
  if (hasPermission('system:user:edit')) {
    actions.push(
      { key: 'authRole', label: $t('system.user.authRole') },
      { key: 'unlock', label: $t('system.user.unlock') },
    );
  }
  return actions;
});
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <ImportModal @success="reload" />
    <ResetPasswordModal />
    <div class="flex h-full gap-3">
      <DeptTree
        v-model:dept-id="deptId"
        class="hidden w-60 shrink-0 md:flex"
        @change="onDeptChange"
      />
      <div class="min-w-0 flex-1">
        <Grid :table-title="$t('system.user.list')">
          <template #toolbar-actions>
            <div class="flex flex-wrap gap-2">
              <ElButton
                v-if="hasPermission('system:user:add')"
                type="primary"
                @click="onCreate"
              >
                {{ $t('system.user.create') }}
              </ElButton>
              <ElButton
                v-if="hasPermission('system:user:remove')"
                :disabled="selectedCount === 0"
                plain
                type="danger"
                @click="onBatchDelete"
              >
                {{ $t('crud.batchDelete') }}
              </ElButton>
              <ElButton
                v-if="hasPermission('system:user:import')"
                @click="onImport"
              >
                {{ $t('system.user.import') }}
              </ElButton>
              <ElButton
                v-if="hasPermission('system:user:export')"
                @click="onExport"
              >
                {{ $t('crud.export') }}
              </ElButton>
            </div>
          </template>

          <template #status="{ row }">
            <ElSwitch
              :disabled="
                !hasPermission('system:user:edit') ||
                isSuperAdminUser(row.userId)
              "
              :loading="switching.has(row.userId)"
              :model-value="row.status === STATUS_NORMAL"
              @change="(checked) => onStatusChange(row, checked as boolean)"
            />
          </template>

          <template #actions="{ row }">
            <span
              v-if="isSuperAdminUser(row.userId)"
              class="text-muted-foreground text-xs"
            >
              {{ $t('system.user.superAdminTip') }}
            </span>
            <template v-else>
              <ElButton
                v-if="hasPermission('system:user:edit')"
                link
                size="small"
                type="primary"
                @click="onEdit(row)"
              >
                {{ $t('common.edit') }}
              </ElButton>
              <ElPopconfirm
                v-if="hasPermission('system:user:remove')"
                :cancel-button-text="$t('common.cancel')"
                :confirm-button-text="$t('system.user.delete')"
                :title="$t('crud.confirmDelete', { name: row.nickName })"
                confirm-button-type="danger"
                placement="left"
                width="240"
                @confirm="onDelete(row)"
              >
                <template #reference>
                  <ElButton link size="small" type="danger">
                    {{ $t('common.delete') }}
                  </ElButton>
                </template>
              </ElPopconfirm>
              <ElDropdown
                v-if="moreActions.length > 0"
                class="ml-3 align-middle"
                placement="bottom-end"
                trigger="click"
                @command="(key: string) => onMoreAction(row, key)"
              >
                <ElButton link size="small" type="primary">
                  {{ $t('system.user.more') }}
                </ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem
                      v-for="action in moreActions"
                      :key="action.key"
                      :command="action.key"
                    >
                      {{ action.label }}
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </template>
          </template>
        </Grid>
      </div>
    </div>
  </Page>
</template>
