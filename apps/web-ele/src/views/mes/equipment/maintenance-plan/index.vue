<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  generateMaintenanceOrders,
  listMaintenancePlan,
  removeMaintenancePlan,
} from '@tuoyu/shared/api/mes/equipment';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElTag,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { useColumns, useSearchSchema } from './data';
import MaintenancePlanDrawer from './maintenance-plan-drawer.vue';

defineOptions({ name: 'MesMaintenancePlan' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: MaintenancePlanDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

const generating = ref(false);

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
        query: async ({ page, sorts }, formValues) => {
          selectedCount.value = 0;
          return await listMaintenancePlan({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'planId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<EquipmentApi.MaintenancePlan>,
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

function onEdit(row: EquipmentApi.MaintenancePlan) {
  drawerApi.setData({ planId: row.planId }).open();
}

async function onDelete(row: EquipmentApi.MaintenancePlan) {
  await removeMaintenancePlan([row.planId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows =
    gridApi.grid.getCheckboxRecords() as EquipmentApi.MaintenancePlan[];
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
  await removeMaintenancePlan(rows.map((row) => row.planId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onGenerate() {
  try {
    await ElMessageBox.confirm(
      $t('mes.equipment.maintenancePlan.generateConfirm'),
      $t('mes.equipment.maintenancePlan.generate'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('mes.equipment.maintenancePlan.generate'),
        type: 'info',
      },
    );
  } catch {
    // 取消
    return;
  }
  generating.value = true;
  try {
    const count = await generateMaintenanceOrders();
    if (count > 0) {
      ElMessage.success(
        $t('mes.equipment.maintenancePlan.generated', { count }),
      );
    } else {
      ElMessage.info($t('mes.equipment.maintenancePlan.nothingGenerated'));
    }
    reload();
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.equipment.maintenancePlan.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:maintenancePlan:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.equipment.maintenancePlan.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:maintenancePlan:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:maintenancePlan:generate')"
            :loading="generating"
            @click="onGenerate"
          >
            {{ $t('mes.equipment.maintenancePlan.generate') }}
          </ElButton>
        </div>
      </template>

      <template #nextDueDate="{ row }">
        {{ row.nextDueDate }}
        <ElTag v-if="row.overdue" class="ml-1" type="danger">
          {{ $t('mes.equipment.common.overdue') }}
        </ElTag>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:maintenancePlan:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('mes:maintenancePlan:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.equipment.maintenancePlan.delete')"
          :title="$t('crud.confirmDelete', { name: row.planName })"
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
