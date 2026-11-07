<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { RoleApi } from '#/api/system/role';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  Button,
  Dropdown,
  Menu,
  message,
  Modal,
  Popconfirm,
  Switch,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  changeRoleStatus,
  exportRole,
  listRole,
  removeRole,
} from '#/api/system/role';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

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
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as RoleApi.Role[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeRole(rows.map((row) => row.roleId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onStatusChange(row: RoleApi.Role, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.roleId);
  try {
    // 已分配给用户的角色后端不允许停用，会返回原因
    await changeRoleStatus(row.roleId, status);
    row.status = status;
    message.success(
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

/** 行内“更多”菜单：停用的角色不能修改数据权限（见 role-drawer.vue 中的说明） */
function moreActions(row: RoleApi.Role) {
  return [
    {
      disabled: row.status === STATUS_DISABLED,
      key: 'dataScope',
      label: $t('system.role.dataPermission'),
      title:
        row.status === STATUS_DISABLED
          ? $t('system.role.disabledRoleTip')
          : undefined,
    },
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
          <Button
            v-if="hasPermission('system:role:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.role.create') }}
          </Button>
          <Button
            v-if="hasPermission('system:role:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button v-if="hasPermission('system:role:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="!hasPermission('system:role:edit') || row.superAdmin"
          :loading="switching.has(row.roleId)"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <span v-if="row.superAdmin" class="text-muted-foreground text-xs">
          {{ $t('system.role.superAdminTip') }}
        </span>
        <template v-else>
          <Button
            v-if="hasPermission('system:role:edit')"
            size="small"
            type="link"
            @click="onEdit(row)"
          >
            {{ $t('common.edit') }}
          </Button>
          <Popconfirm
            v-if="hasPermission('system:role:remove')"
            :ok-button-props="{ danger: true }"
            :ok-text="$t('system.role.delete')"
            :title="$t('crud.confirmDelete', { name: row.roleName })"
            placement="left"
            @confirm="onDelete(row)"
          >
            <Button danger size="small" type="link">
              {{ $t('common.delete') }}
            </Button>
          </Popconfirm>
          <Dropdown
            v-if="hasPermission('system:role:edit')"
            placement="bottomRight"
          >
            <Button size="small" type="link">
              {{ $t('system.role.more') }}
            </Button>
            <template #overlay>
              <Menu
                :items="moreActions(row)"
                @click="({ key }) => onMoreAction(row, String(key))"
              />
            </template>
          </Dropdown>
        </template>
      </template>
    </Grid>
  </Page>
</template>
