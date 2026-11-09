<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DefectApi } from '#/api/mes/defect';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import { Button } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { exportDefect, getDefectLogs, listDefect } from '#/api/mes/defect';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import StatusLogModal from '#/views/mes/material-request/status-log-modal.vue';

import { useColumns, useSearchSchema } from './data';
import DefectDrawer from './defect-drawer.vue';
import HandleModal from './handle-modal.vue';

defineOptions({ name: 'MesDefect' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: DefectDrawer,
  destroyOnClose: true,
});
const [Handle, handleApi] = useVbenModal({
  connectedComponent: HandleModal,
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
          await listDefect({ ...toPageQuery(page, sorts), ...formValues }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'defectId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DefectApi.Defect>,
});

function reload() {
  gridApi.query();
}

function isPending(row: DefectApi.Defect) {
  return row.handleStatus === 'pending';
}

function onHandle(row: DefectApi.Defect) {
  handleApi.setData(row).open();
}

function onLogs(row: DefectApi.Defect) {
  logsApi
    .setData({
      enumType: 'DefectHandleStatus',
      load: () => getDefectLogs(row.defectId),
      title: $t('mes.defect.logsTitle', { code: row.defectCode }),
    })
    .open();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.defect.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportDefect(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Handle @success="reload" />
    <Logs />
    <Grid :table-title="$t('mes.defect.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:defect:add')"
            type="primary"
            @click="drawerApi.open()"
          >
            {{ $t('mes.defect.create') }}
          </Button>
          <Button v-if="hasPermission('mes:defect:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #sourceType="{ row }">
        <EnumTag :value="row.sourceType" type="DefectSource" />
      </template>

      <template #defectLevel="{ row }">
        <EnumTag :value="row.defectLevel" type="DefectLevel" />
      </template>

      <template #handleStatus="{ row }">
        <EnumTag :value="row.handleStatus" type="DefectHandleStatus" />
      </template>

      <template #handleMethod="{ row }">
        <EnumTag :value="row.handleMethod" type="DefectHandleMethod" />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="isPending(row) && hasPermission('mes:defect:handle')"
          size="small"
          type="link"
          @click="onHandle(row)"
        >
          {{ $t('mes.defect.handle') }}
        </Button>
        <Button
          v-if="hasPermission('mes:defect:query')"
          size="small"
          type="link"
          @click="onLogs(row)"
        >
          {{ $t('mes.defect.logs') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
