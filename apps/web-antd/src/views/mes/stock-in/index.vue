<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { StockInApi } from '#/api/mes/stockIn';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  cancelStockIn,
  completeStockIn,
  getStockInLogs,
  listStockIn,
} from '#/api/mes/stockIn';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';
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
  message.success($t('mes.stockIn.completed'));
  reload();
}

async function onCancel(row: StockInApi.StockIn) {
  await cancelStockIn(row.stockInId);
  message.success($t('mes.stockIn.cancelled'));
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
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Logs />
    <Grid :table-title="$t('mes.stockIn.list')">
      <template #toolbar-actions>
        <Button
          v-if="hasPermission('mes:stockIn:add')"
          type="primary"
          @click="drawerApi.open()"
        >
          {{ $t('mes.stockIn.create') }}
        </Button>
      </template>

      <template #stockInStatus="{ row }">
        <EnumTag :value="row.stockInStatus" type="StockInStatus" />
      </template>

      <template #actions="{ row }">
        <Popconfirm
          v-if="isSubmitted(row) && hasPermission('mes:stockIn:complete')"
          :ok-text="$t('mes.stockIn.complete')"
          :title="$t('mes.stockIn.confirmComplete', { code: row.stockInCode })"
          placement="left"
          @confirm="onComplete(row)"
        >
          <Button size="small" type="link">
            {{ $t('mes.stockIn.complete') }}
          </Button>
        </Popconfirm>
        <Popconfirm
          v-if="isSubmitted(row) && hasPermission('mes:stockIn:cancel')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.stockIn.cancelStockIn')"
          :title="$t('mes.stockIn.confirmCancel', { code: row.stockInCode })"
          placement="left"
          @confirm="onCancel(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('mes.stockIn.cancelStockIn') }}
          </Button>
        </Popconfirm>
        <Button
          v-if="hasPermission('mes:stockIn:query')"
          size="small"
          type="link"
          @click="onLogs(row)"
        >
          {{ $t('mes.stockIn.logs') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
