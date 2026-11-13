<script lang="ts" setup>
import type { StockInApi } from '@tuoyu/shared/api/mes/stockIn';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  cancelStockIn,
  completeStockIn,
  exportStockIn,
  getStockInLogs,
  listStockIn,
} from '@tuoyu/shared/api/mes/stockIn';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import StatusLogModal from '#/views/mes/material-request/status-log-modal.vue';

import { useColumns, useSearchSchema } from './data';
import StockInDrawer from './stock-in-drawer.vue';

defineOptions({ name: 'MesStockIn' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: StockInDrawer,
  destroyOnClose: true,
});
const [Logs, logsApi] = useVbenModal({
  connectedComponent: StatusLogModal,
  destroyOnClose: true,
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
          await listStockIn({ ...toPageQuery(page, sorts), ...formValues }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'stockInId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<StockInApi.StockIn>,
});

function reload() {
  gridApi.query();
}

function isSubmitted(row: StockInApi.StockIn) {
  return row.stockInStatus === 'submitted';
}

async function onComplete(row: StockInApi.StockIn) {
  await completeStockIn(row.stockInId);
  ElMessage.success($t('mes.stockIn.completed'));
  reload();
}

async function onCancel(row: StockInApi.StockIn) {
  await cancelStockIn(row.stockInId);
  ElMessage.success($t('mes.stockIn.cancelled'));
  reload();
}

function onLogs(row: StockInApi.StockIn) {
  logsApi
    .setData({
      enumType: 'StockInStatus',
      load: () => getStockInLogs(row.stockInId),
      title: $t('mes.stockIn.logsTitle', { code: row.stockInCode }),
    })
    .open();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.stockIn.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportStockIn(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Logs />
    <Grid :table-title="$t('mes.stockIn.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:stockIn:add')"
            type="primary"
            @click="drawerApi.open()"
          >
            {{ $t('mes.stockIn.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:stockIn:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #stockInStatus="{ row }">
        <EnumTag :value="row.stockInStatus" type="StockInStatus" />
      </template>

      <template #actions="{ row }">
        <ElPopconfirm
          v-if="isSubmitted(row) && hasPermission('mes:stockIn:complete')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.stockIn.complete')"
          :title="$t('mes.stockIn.confirmComplete', { code: row.stockInCode })"
          placement="left"
          width="260"
          @confirm="onComplete(row)"
        >
          <template #reference>
            <ElButton link size="small" type="primary">
              {{ $t('mes.stockIn.complete') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElPopconfirm
          v-if="isSubmitted(row) && hasPermission('mes:stockIn:cancel')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.stockIn.cancelStockIn')"
          :title="$t('mes.stockIn.confirmCancel', { code: row.stockInCode })"
          confirm-button-type="danger"
          placement="left"
          width="260"
          @confirm="onCancel(row)"
        >
          <template #reference>
            <ElButton link size="small" type="danger">
              {{ $t('mes.stockIn.cancelStockIn') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-if="hasPermission('mes:stockIn:query')"
          link
          size="small"
          type="primary"
          @click="onLogs(row)"
        >
          {{ $t('mes.stockIn.logs') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
