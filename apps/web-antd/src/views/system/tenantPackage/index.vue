<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TenantPackageApi } from '#/api/system/tenantPackage';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Modal, Popconfirm, Switch } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getTenantPackage,
  listTenantPackage,
  removeTenantPackage,
  updateTenantPackage,
} from '#/api/system/tenantPackage';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

import { useColumns, useSearchSchema } from './data';
import TenantPackageDrawer from './tenant-package-drawer.vue';

defineOptions({ name: 'SystemTenantPackage' });

/** 字典 sys_normal_disable：0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: TenantPackageDrawer,
  destroyOnClose: true,
});

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
    checkboxConfig: { highlight: true },
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listTenantPackage({
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'packageId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<TenantPackageApi.TenantPackage>,
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

function onEdit(row: TenantPackageApi.TenantPackage) {
  drawerApi.setData({ packageId: String(row.packageId) }).open();
}

async function onDelete(row: TenantPackageApi.TenantPackage) {
  await removeTenantPackage([String(row.packageId)]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows =
    gridApi.grid.getCheckboxRecords() as TenantPackageApi.TenantPackage[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeTenantPackage(rows.map((row) => String(row.packageId)));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

/** 状态开关需要读出套餐的菜单一起提交（修改接口要求 menuIds） */
const canChangeStatus = () =>
  hasPermission('system:tenantPackage:edit') &&
  hasPermission('system:tenantPackage:query');

async function onStatusChange(
  row: TenantPackageApi.TenantPackage,
  checked: boolean,
) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  const id = String(row.packageId);
  switching.value.add(id);
  try {
    // 后端没有单独修改状态的接口：读出现有菜单，原样提交
    const detail = await getTenantPackage(id);
    await updateTenantPackage({
      menuIds: (detail.menuIds ?? []).map(String),
      packageId: id,
      packageName: detail.packageName,
      remark: detail.remark,
      status,
    });
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.packageName,
      }),
    );
  } finally {
    switching.value.delete(id);
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.tenantPackage.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('system:tenantPackage:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.tenantPackage.create') }}
          </Button>
          <Button
            v-if="hasPermission('system:tenantPackage:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="!canChangeStatus()"
          :loading="switching.has(String(row.packageId))"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('system:tenantPackage:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('system:tenantPackage:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.tenantPackage.delete')"
          :title="$t('crud.confirmDelete', { name: row.packageName })"
          placement="left"
          @confirm="onDelete(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('common.delete') }}
          </Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
