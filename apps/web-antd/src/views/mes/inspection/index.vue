<script lang="ts" setup>
import type { InspectionApi } from '@tuoyu/shared/api/mes/inspection';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportInspection,
  getInspectionLogs,
  listInspection,
  removeInspection,
} from '@tuoyu/shared/api/mes/inspection';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import StatusLogModal from '#/views/mes/material-request/status-log-modal.vue';

import { useColumns, useSearchSchema } from './data';
import InspectModal from './inspect-modal.vue';
import InspectionDrawer from './inspection-drawer.vue';

defineOptions({ name: 'MesInspection' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: InspectionDrawer,
  destroyOnClose: true,
});
const [Inspect, inspectApi] = useVbenModal({
  connectedComponent: InspectModal,
  destroyOnClose: true,
});
const [Logs, logsApi] = useVbenModal({
  connectedComponent: StatusLogModal,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    schema: useSearchSchema(),
    showCollapseButton: true,
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
          await listInspection({ ...toPageQuery(page, sorts), ...formValues }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'inspectionId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<InspectionApi.Inspection>,
});

function reload() {
  gridApi.query();
}

function isPending(row: InspectionApi.Inspection) {
  return row.inspectionStatus === 'pending';
}

function onInspect(row: InspectionApi.Inspection) {
  inspectApi.setData({ inspectionId: row.inspectionId }).open();
}

async function onDelete(row: InspectionApi.Inspection) {
  await removeInspection([row.inspectionId]);
  message.success($t('crud.deleted'));
  reload();
}

function onLogs(row: InspectionApi.Inspection) {
  logsApi
    .setData({
      enumType: 'InspectionStatus',
      load: () => getInspectionLogs(row.inspectionId),
      title: $t('mes.inspection.logsTitle', { code: row.inspectionCode }),
    })
    .open();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.inspection.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportInspection(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Inspect @success="reload" />
    <Logs />
    <Grid :table-title="$t('mes.inspection.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:inspection:add')"
            type="primary"
            @click="drawerApi.open()"
          >
            {{ $t('mes.inspection.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:inspection:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #inspectionType="{ row }">
        <EnumTag :value="row.inspectionType" type="InspectionType" />
      </template>

      <template #inspectionStatus="{ row }">
        <EnumTag :value="row.inspectionStatus" type="InspectionStatus" />
      </template>

      <template #inspectionResult="{ row }">
        <EnumTag :value="row.inspectionResult" type="InspectionResult" />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="isPending(row) && hasPermission('mes:inspection:inspect')"
          size="small"
          type="link"
          @click="onInspect(row)"
        >
          {{ $t('mes.inspection.inspect') }}
        </Button>
        <Popconfirm
          v-if="isPending(row) && hasPermission('mes:inspection:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.inspection.delete')"
          :title="$t('crud.confirmDelete', { name: row.inspectionCode })"
          placement="left"
          @confirm="onDelete(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('common.delete') }}
          </Button>
        </Popconfirm>
        <Button
          v-if="hasPermission('mes:inspection:query')"
          size="small"
          type="link"
          @click="onLogs(row)"
        >
          {{ $t('mes.inspection.logs') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
