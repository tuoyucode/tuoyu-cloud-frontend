<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { OrderAction } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  cancelMaintenanceOrder,
  exportMaintenanceOrder,
  getMaintenanceOrderLogs,
  listMaintenanceOrder,
  startMaintenanceOrder,
} from '@tuoyu/shared/api/mes/equipment';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';
import ReasonModal from '../common/reason-modal.vue';
import StatusLogModal from '../common/status-log-modal.vue';
import CompleteModal from './complete-modal.vue';
import {
  availableOrderActions,
  toQuery,
  useColumns,
  useSearchSchema,
} from './data';
import OrderDetailDrawer from './order-detail-drawer.vue';

defineOptions({ name: 'MesMaintenanceOrder' });

const ACTION_PERMISSIONS: Record<OrderAction, string> = {
  cancel: 'mes:maintenanceOrder:cancel',
  complete: 'mes:maintenanceOrder:complete',
  start: 'mes:maintenanceOrder:start',
};

const ACTION_LABELS: Record<OrderAction, string> = {
  cancel: 'mes.equipment.maintenanceOrder.cancel',
  complete: 'mes.equipment.maintenanceOrder.complete',
  start: 'mes.equipment.maintenanceOrder.start',
};

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: OrderDetailDrawer,
  destroyOnClose: true,
});

const [CompleteDialog, completeApi] = useVbenModal({
  connectedComponent: CompleteModal,
});

const [ReasonDialog, reasonApi] = useVbenModal({
  connectedComponent: ReasonModal,
});

const [LogDialog, logApi] = useVbenModal({
  connectedComponent: StatusLogModal,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) =>
          await listMaintenanceOrder({
            ...toPageQuery(page, sorts),
            ...toQuery(formValues),
          }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'orderId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<EquipmentApi.MaintenanceOrder>,
});

function reload() {
  gridApi.query();
}

/** 当前用户可以执行的动作 */
function actionsOf(row: EquipmentApi.MaintenanceOrder) {
  return availableOrderActions(row.orderStatus).filter((action) =>
    hasPermission(ACTION_PERMISSIONS[action]),
  );
}

async function run(action: OrderAction, row: EquipmentApi.MaintenanceOrder) {
  if (action === 'complete') {
    completeApi.setData({ order: row }).open();
    return;
  }
  if (action === 'cancel') {
    reasonApi
      .setData({
        description: $t('mes.equipment.maintenanceOrder.cancelHelp'),
        okText: $t('mes.equipment.maintenanceOrder.cancel'),
        async submit(reason: string) {
          await cancelMaintenanceOrder(row.orderId, reason);
          ElMessage.success($t('mes.equipment.maintenanceOrder.cancelled'));
        },
        title: `${$t('mes.equipment.maintenanceOrder.cancelTitle')} ${row.orderCode}`,
      })
      .open();
    return;
  }
  try {
    await ElMessageBox.confirm(
      `${row.orderCode} ${row.deviceName ?? ''}`,
      $t('mes.equipment.maintenanceOrder.start'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('mes.equipment.maintenanceOrder.start'),
        type: 'info',
      },
    );
  } catch {
    // 取消
    return;
  }
  await startMaintenanceOrder(row.orderId);
  ElMessage.success($t('mes.equipment.maintenanceOrder.started'));
  reload();
}

function onDetail(row: EquipmentApi.MaintenanceOrder) {
  detailDrawerApi.setData({ orderId: row.orderId }).open();
}

function onLogs(row: EquipmentApi.MaintenanceOrder) {
  logApi
    .setData({
      load: () => getMaintenanceOrderLogs(row.orderId),
      statusType: 'MaintenanceOrderStatus',
      title: $t('mes.equipment.common.logsTitle', { code: row.orderCode }),
    })
    .open();
}

async function onExport() {
  const values = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.equipment.maintenanceOrder.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportMaintenanceOrder(toQuery(values), fileName);
}
</script>

<template>
  <Page auto-content-height>
    <DetailDrawer />
    <CompleteDialog @success="reload" />
    <ReasonDialog @success="reload" />
    <LogDialog />
    <Grid :table-title="$t('mes.equipment.maintenanceOrder.list')">
      <template #toolbar-actions>
        <ElButton
          v-if="hasPermission('mes:maintenanceOrder:export')"
          @click="onExport"
        >
          {{ $t('crud.export') }}
        </ElButton>
      </template>

      <template #orderCode="{ row }">
        <ElButton
          v-if="hasPermission('mes:maintenanceOrder:query')"
          link
          type="primary"
          @click="onDetail(row)"
        >
          {{ row.orderCode }}
        </ElButton>
        <span v-else>{{ row.orderCode }}</span>
      </template>

      <template #status="{ row }">
        <EquipmentTag :value="row.orderStatus" type="MaintenanceOrderStatus" />
      </template>

      <template #dueDate="{ row }">
        {{ row.dueDate }}
        <ElTag v-if="row.overdue" class="ml-1" type="danger">
          {{ $t('mes.equipment.common.overdue') }}
        </ElTag>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-for="action in actionsOf(row)"
          :key="action"
          :type="action === 'cancel' ? 'danger' : 'primary'"
          link
          size="small"
          @click="run(action, row)"
        >
          {{ $t(ACTION_LABELS[action]) }}
        </ElButton>
        <ElButton
          v-if="hasPermission('mes:maintenanceOrder:query')"
          link
          size="small"
          type="primary"
          @click="onLogs(row)"
        >
          {{ $t('mes.equipment.common.logs') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
