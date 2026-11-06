<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TenantApi } from '#/api/system/tenant';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Modal, Popconfirm, Switch } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  changeTenantStatus,
  isDefaultTenant,
  listTenant,
  removeTenant,
} from '#/api/system/tenant';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

import { loadPackageOptions, useColumns, useSearchSchema } from './data';
import TenantDrawer from './tenant-drawer.vue';

defineOptions({ name: 'SystemTenant' });

/** 字典 sys_normal_disable：0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: TenantDrawer,
  destroyOnClose: true,
});

/** 套餐 ID → 名称（只含启用的套餐；停用的套餐显示编号） */
const packageNames = ref(new Map<string, string>());

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    // 默认租户（平台）不能删除
    checkboxConfig: {
      checkMethod: ({ row }) => !isDefaultTenant(row.tenantId),
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
          return await listTenant({
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'tenantId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<TenantApi.Tenant>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
  loadPackageNames();
}

async function loadPackageNames() {
  try {
    const options = await loadPackageOptions();
    packageNames.value = new Map(
      options.map((item) => [item.value, item.label]),
    );
  } catch {
    // 套餐名称只用于展示，加载失败时显示编号
  }
}

function packageLabel(row: TenantApi.Tenant) {
  if (row.packageId === null || row.packageId === undefined) {
    // 默认租户不属于任何套餐，可以使用全部菜单
    return $t('system.tenant.allMenus');
  }
  const id = String(row.packageId);
  return packageNames.value.get(id) ?? id;
}

function isExpired(row: TenantApi.Tenant) {
  return Boolean(row.expireTime) && dayjs(row.expireTime).isBefore(dayjs());
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: TenantApi.Tenant) {
  drawerApi.setData({ tenantId: row.tenantId }).open();
}

async function onDelete(row: TenantApi.Tenant) {
  await removeTenant([row.tenantId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as TenantApi.Tenant[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('system.tenant.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeTenant(rows.map((row) => row.tenantId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onStatusChange(row: TenantApi.Tenant, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.tenantId);
  try {
    await changeTenantStatus(row.tenantId, status);
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.tenantName,
      }),
    );
  } finally {
    switching.value.delete(row.tenantId);
  }
}

onMounted(loadPackageNames);
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.tenant.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('system:tenant:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.tenant.create') }}
          </Button>
          <Button
            v-if="hasPermission('system:tenant:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #package="{ row }">
        {{ packageLabel(row) }}
      </template>

      <template #expireTime="{ row }">
        <span v-if="!row.expireTime" class="text-muted-foreground">
          {{ $t('system.tenant.neverExpire') }}
        </span>
        <span
          v-else-if="isExpired(row)"
          :title="$t('system.tenant.expired')"
          class="text-destructive"
        >
          {{ row.expireTime }}
        </span>
        <span v-else>{{ row.expireTime }}</span>
      </template>

      <template #accountCount="{ row }">
        <span
          v-if="row.accountCount === null || row.accountCount === undefined"
          class="text-muted-foreground"
        >
          {{ $t('system.tenant.unlimited') }}
        </span>
        <span v-else>{{ row.accountCount }}</span>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="
            isDefaultTenant(row.tenantId) ||
            !hasPermission('system:tenant:edit')
          "
          :loading="switching.has(row.tenantId)"
          :title="
            isDefaultTenant(row.tenantId)
              ? $t('system.tenant.defaultTenantTip')
              : undefined
          "
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('system:tenant:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="
            hasPermission('system:tenant:remove') &&
            !isDefaultTenant(row.tenantId)
          "
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.tenant.delete')"
          :title="$t('system.tenant.confirmDelete', { name: row.tenantName })"
          placement="left"
          @confirm="onDelete(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('common.delete') }}
          </Button>
        </Popconfirm>
        <Button
          v-else-if="hasPermission('system:tenant:remove')"
          :title="$t('system.tenant.defaultTenantTip')"
          danger
          disabled
          size="small"
          type="link"
        >
          {{ $t('common.delete') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
