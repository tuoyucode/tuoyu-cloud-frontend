<script lang="ts" setup>
import type { TenantPackageApi } from '@tuoyu/shared/api/system/tenantPackage';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  getTenantPackage,
  listTenantPackage,
  removeTenantPackage,
  updateTenantPackage,
} from '@tuoyu/shared/api/system/tenantPackage';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

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
            ...toPageQuery(page),
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
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows =
    gridApi.grid.getCheckboxRecords() as TenantPackageApi.TenantPackage[];
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
  await removeTenantPackage(rows.map((row) => String(row.packageId)));
  ElMessage.success($t('crud.deleted'));
  reload();
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
    ElMessage.success(
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
          <ElButton
            v-if="hasPermission('system:tenantPackage:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.tenantPackage.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:tenantPackage:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!canChangeStatus()"
          :loading="switching.has(String(row.packageId))"
          :model-value="row.status === STATUS_NORMAL"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('system:tenantPackage:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('system:tenantPackage:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('system.tenantPackage.delete')"
          :title="$t('crud.confirmDelete', { name: row.packageName })"
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
      </template>
    </Grid>
  </Page>
</template>
