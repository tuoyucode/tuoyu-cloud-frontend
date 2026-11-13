<script lang="ts" setup>
import type { LocationApi } from '@tuoyu/shared/api/mes/location';
import type { WarehouseApi } from '@tuoyu/shared/api/mes/warehouse';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  listLocation,
  removeLocation,
  updateLocation,
} from '@tuoyu/shared/api/mes/location';
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

import { useLocationColumns, useLocationSearchSchema } from './data';
import LocationDrawer from './location-drawer.vue';

const props = defineProps<{
  /** 左侧选中的仓库；为空时不显示库位 */
  warehouse?: WarehouseApi.Warehouse;
}>();

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: LocationDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useLocationSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useLocationColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) => {
          selectedCount.value = 0;
          const warehouseId = props.warehouse?.warehouseId;
          if (!warehouseId) {
            return { items: [], total: 0 };
          }
          return await listLocation({
            ...toPageQuery(page, sorts),
            ...formValues,
            warehouseId,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'locationId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<LocationApi.Location>,
});

// 切换仓库后回到第一页重新查询
watch(
  () => props.warehouse?.warehouseId,
  () => gridApi.reload(),
);

const title = computed(() =>
  props.warehouse
    ? $t('mes.warehouse.location.listOf', {
        name: props.warehouse.warehouseName,
      })
    : $t('mes.warehouse.location.list'),
);

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  if (!props.warehouse) {
    return;
  }
  drawerApi
    .setData({
      warehouseId: props.warehouse.warehouseId,
      warehouseName: props.warehouse.warehouseName,
    })
    .open();
}

function onEdit(row: LocationApi.Location) {
  drawerApi
    .setData({
      locationId: row.locationId,
      warehouseId: row.warehouseId,
      warehouseName: props.warehouse?.warehouseName,
    })
    .open();
}

async function onDelete(row: LocationApi.Location) {
  await removeLocation([row.locationId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as LocationApi.Location[];
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
  await removeLocation(rows.map((row) => row.locationId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onStatusChange(row: LocationApi.Location, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.locationId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateLocation({ ...row, status });
    row.status = status;
    ElMessage.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.locationName,
      }),
    );
  } finally {
    switching.value.delete(row.locationId);
  }
}
</script>

<template>
  <div class="h-full">
    <Drawer @success="reload" />
    <Grid :table-title="title">
      <template #toolbar-actions>
        <div v-if="warehouse" class="flex flex-wrap gap-2">
          <ElButton
            v-if="hasPermission('mes:warehouse:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.warehouse.location.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:warehouse:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
        <span v-else class="text-muted-foreground">
          {{ $t('mes.warehouse.location.selectWarehouse') }}
        </span>
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!hasPermission('mes:warehouse:edit')"
          :loading="switching.has(row.locationId)"
          :model-value="row.status === STATUS_NORMAL"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:warehouse:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('mes:warehouse:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.warehouse.location.delete')"
          :title="$t('crud.confirmDelete', { name: row.locationName })"
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
  </div>
</template>
