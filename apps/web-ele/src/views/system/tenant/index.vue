<script lang="ts" setup>
import type { TenantApi } from '@tuoyu/shared/api/system/tenant';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  changeTenantStatus,
  isDefaultTenant,
  listTenant,
  removeTenant,
} from '@tuoyu/shared/api/system/tenant';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import dayjs from 'dayjs';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
  ElTooltip,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

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
            ...toPageQuery(page),
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
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as TenantApi.Tenant[];
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('system.tenant.confirmBatchDelete', { count: rows.length }),
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
  await removeTenant(rows.map((row) => row.tenantId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onStatusChange(row: TenantApi.Tenant, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.tenantId);
  try {
    await changeTenantStatus(row.tenantId, status);
    row.status = status;
    ElMessage.success(
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
          <ElButton
            v-if="hasPermission('system:tenant:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.tenant.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:tenant:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
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
        <!-- 默认租户不能停用：开关禁用，悬停说明原因（禁用的开关收不到鼠标事件，提示挂在外层） -->
        <ElTooltip
          :content="$t('system.tenant.defaultTenantTip')"
          :disabled="!isDefaultTenant(row.tenantId)"
        >
          <span class="inline-flex">
            <ElSwitch
              :disabled="
                isDefaultTenant(row.tenantId) ||
                !hasPermission('system:tenant:edit')
              "
              :loading="switching.has(row.tenantId)"
              :model-value="row.status === STATUS_NORMAL"
              @change="(checked) => onStatusChange(row, checked as boolean)"
            />
          </span>
        </ElTooltip>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('system:tenant:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="
            hasPermission('system:tenant:remove') &&
            !isDefaultTenant(row.tenantId)
          "
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('system.tenant.delete')"
          :title="$t('system.tenant.confirmDelete', { name: row.tenantName })"
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
        <ElTooltip
          v-else-if="hasPermission('system:tenant:remove')"
          :content="$t('system.tenant.defaultTenantTip')"
          placement="left"
        >
          <span class="ml-3 inline-flex">
            <ElButton disabled link size="small" type="danger">
              {{ $t('common.delete') }}
            </ElButton>
          </span>
        </ElTooltip>
      </template>
    </Grid>
  </Page>
</template>
