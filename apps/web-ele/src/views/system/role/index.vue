<script lang="ts" setup>
import type { RoleApi } from '@tuoyu/shared/api/system/role';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  changeRoleStatus,
  exportRole,
  listRole,
  removeRole,
} from '@tuoyu/shared/api/system/role';
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
import RoleDataScopeDrawer from './role-data-scope-drawer.vue';
import RoleDrawer from './role-drawer.vue';

defineOptions({ name: 'SystemRole' });

/** 字典 sys_normal_disable：0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const router = useRouter();

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: RoleDrawer,
  destroyOnClose: true,
});

const [DataScopeDrawer, dataScopeDrawerApi] = useVbenDrawer({
  connectedComponent: RoleDataScopeDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    fieldMappingTime: searchFieldMappingTime,
    schema: useSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: {
      checkMethod: ({ row }) => !row.superAdmin,
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
          return await listRole({
            ...toPageQuery(page),
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'roleId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<RoleApi.Role>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: RoleApi.Role) {
  drawerApi.setData({ roleId: row.roleId }).open();
}

async function onDelete(row: RoleApi.Role) {
  await removeRole([row.roleId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as RoleApi.Role[];
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
  await removeRole(rows.map((row) => row.roleId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onStatusChange(row: RoleApi.Role, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.roleId);
  try {
    // 已分配给用户的角色后端不允许停用，会返回原因
    await changeRoleStatus(row.roleId, status);
    row.status = status;
    ElMessage.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.roleName,
      }),
    );
  } finally {
    switching.value.delete(row.roleId);
  }
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('system.role.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportRole(query, fileName);
}

/** 行内“更多”菜单：数据权限、分配用户（停用的角色同样可以修改，启用后生效） */
function moreActions() {
  return [
    { key: 'dataScope', label: $t('system.role.dataPermission') },
    { key: 'authUser', label: $t('system.role.authUser') },
  ];
}

function onMoreAction(row: RoleApi.Role, key: string) {
  if (key === 'dataScope') {
    dataScopeDrawerApi.setData({ roleId: row.roleId }).open();
  } else if (key === 'authUser') {
    router.push(`/system/role-auth/user/${row.roleId}`);
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <DataScopeDrawer @success="reload" />
    <Grid :table-title="$t('system.role.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('system:role:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.role.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:role:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:role:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!hasPermission('system:role:edit') || row.superAdmin"
          :loading="switching.has(row.roleId)"
          :model-value="row.status === STATUS_NORMAL"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <span v-if="row.superAdmin" class="text-muted-foreground text-xs">
          {{ $t('system.role.superAdminTip') }}
        </span>
        <template v-else>
          <ElButton
            v-if="hasPermission('system:role:edit')"
            link
            size="small"
            type="primary"
            @click="onEdit(row)"
          >
            {{ $t('common.edit') }}
          </ElButton>
          <ElPopconfirm
            v-if="hasPermission('system:role:remove')"
            :cancel-button-text="$t('common.cancel')"
            :confirm-button-text="$t('system.role.delete')"
            :title="$t('crud.confirmDelete', { name: row.roleName })"
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
            v-if="hasPermission('system:role:edit')"
            class="ml-3 align-middle"
            placement="bottom-end"
            trigger="click"
            @command="(key: string) => onMoreAction(row, key)"
          >
            <ElButton link size="small" type="primary">
              {{ $t('system.role.more') }}
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem
                  v-for="action in moreActions()"
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
  </Page>
</template>
