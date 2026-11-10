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
import { Button, message, Modal, Popconfirm, Tag } from 'ant-design-vue';

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
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows =
    gridApi.grid.getCheckboxRecords() as EquipmentApi.MaintenancePlan[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeMaintenancePlan(rows.map((row) => row.planId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

function onGenerate() {
  Modal.confirm({
    content: $t('mes.equipment.maintenancePlan.generateConfirm'),
    okText: $t('mes.equipment.maintenancePlan.generate'),
    async onOk() {
      generating.value = true;
      try {
        const count = await generateMaintenanceOrders();
        if (count > 0) {
          message.success(
            $t('mes.equipment.maintenancePlan.generated', { count }),
          );
        } else {
          message.info($t('mes.equipment.maintenancePlan.nothingGenerated'));
        }
        reload();
      } finally {
        generating.value = false;
      }
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.equipment.maintenancePlan.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:maintenancePlan:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.equipment.maintenancePlan.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:maintenancePlan:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('mes:maintenancePlan:generate')"
            :loading="generating"
            @click="onGenerate"
          >
            {{ $t('mes.equipment.maintenancePlan.generate') }}
          </Button>
        </div>
      </template>

      <template #nextDueDate="{ row }">
        {{ row.nextDueDate }}
        <Tag v-if="row.overdue" class="ml-1" color="error">
          {{ $t('mes.equipment.common.overdue') }}
        </Tag>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:maintenancePlan:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:maintenancePlan:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.equipment.maintenancePlan.delete')"
          :title="$t('crud.confirmDelete', { name: row.planName })"
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
