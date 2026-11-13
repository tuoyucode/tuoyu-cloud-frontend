<script lang="ts" setup>
import type { WarehouseApi } from '@tuoyu/shared/api/mes/warehouse';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportWarehouse,
  listWarehouse,
  removeWarehouse,
  updateWarehouse,
} from '@tuoyu/shared/api/mes/warehouse';
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

import EnumTag from '../_shared/enum-tag.vue';
import { useWarehouseColumns, useWarehouseSearchSchema } from './data';
import WarehouseDrawer from './warehouse-drawer.vue';

const props = defineProps<{
  /** 当前选中的仓库 ID */
  selectedId?: string;
}>();

const emit = defineEmits<{
  /** 选中的仓库变化；为空表示没有选中 */
  select: [row: undefined | WarehouseApi.Warehouse];
}>();

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: WarehouseDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    schema: useWarehouseSearchSchema(),
    showCollapseButton: true,
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
    currentRowChange: ({ row }: { row: WarehouseApi.Warehouse }) => {
      emit('select', row);
    },
    proxyQuery: restoreCurrentRow,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useWarehouseColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) => {
          selectedCount.value = 0;
          return await listWarehouse({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isCurrent: true, isHover: true, keyField: 'warehouseId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<WarehouseApi.Warehouse>,
});

/**
 * 列表加载后恢复选中行：选中的仓库在本页时重新高亮（并带出修改后的名称）；
 * 还没有选中任何仓库时默认选中第一行
 */
async function restoreCurrentRow() {
  const rows = gridApi.grid.getData() as WarehouseApi.Warehouse[];
  const current = props.selectedId
    ? rows.find((row) => row.warehouseId === props.selectedId)
    : rows[0];
  if (current) {
    await gridApi.grid.setCurrentRow(current);
    emit('select', current);
  }
}

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: WarehouseApi.Warehouse) {
  drawerApi.setData({ warehouseId: row.warehouseId }).open();
}

/** 删除后，如果删掉的是选中的仓库，清空右侧的库位 */
async function afterDelete(warehouseIds: string[]) {
  ElMessage.success($t('crud.deleted'));
  if (props.selectedId && warehouseIds.includes(props.selectedId)) {
    emit('select', undefined);
  }
  reload();
}

async function onDelete(row: WarehouseApi.Warehouse) {
  await removeWarehouse([row.warehouseId]);
  await afterDelete([row.warehouseId]);
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as WarehouseApi.Warehouse[];
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
  const warehouseIds = rows.map((row) => row.warehouseId);
  await removeWarehouse(warehouseIds);
  await afterDelete(warehouseIds);
}

async function onStatusChange(row: WarehouseApi.Warehouse, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.warehouseId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateWarehouse({ ...row, status });
    row.status = status;
    ElMessage.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.warehouseName,
      }),
    );
  } finally {
    switching.value.delete(row.warehouseId);
  }
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.warehouse.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportWarehouse(query, fileName);
}
</script>

<template>
  <div class="h-full">
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.warehouse.list')">
      <template #toolbar-actions>
        <div class="flex flex-wrap gap-2">
          <ElButton
            v-if="hasPermission('mes:warehouse:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.warehouse.create') }}
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
          <ElButton
            v-if="hasPermission('mes:warehouse:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #warehouseType="{ row }">
        <EnumTag :value="row.warehouseType" type="WarehouseType" />
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!hasPermission('mes:warehouse:edit')"
          :loading="switching.has(row.warehouseId)"
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
          :confirm-button-text="$t('mes.warehouse.delete')"
          :title="$t('crud.confirmDelete', { name: row.warehouseName })"
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
