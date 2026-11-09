<script lang="ts" setup>
import type { OperlogApi } from '@tuoyu/shared/api/monitor/operlog';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  cleanOperlog,
  exportOperlog,
  listOperlog,
  removeOperlog,
} from '@tuoyu/shared/api/monitor/operlog';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { toQuery, useColumns, useSearchSchema } from './data';
import OperlogDrawer from './operlog-drawer.vue';

defineOptions({ name: 'MonitorOperlog' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: OperlogDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
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
          return await listOperlog({
            ...toQuery(formValues),
            ...toPageQuery(page, sorts),
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'operId' },
    sortConfig: { remote: true, trigger: 'cell' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<OperlogApi.Operlog>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onDetail(row: OperlogApi.Operlog) {
  drawerApi.setData({ row }).open();
}

async function onDelete(row: OperlogApi.Operlog) {
  await removeOperlog([row.operId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as OperlogApi.Operlog[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeOperlog(rows.map((row) => row.operId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

function onClean() {
  Modal.confirm({
    content: $t('monitor.operlog.confirmClean'),
    okButtonProps: { danger: true },
    okText: $t('monitor.operlog.clean'),
    title: $t('monitor.operlog.cleanTitle'),
    async onOk() {
      await cleanOperlog();
      message.success($t('monitor.operlog.cleaned'));
      reload();
    },
  });
}

async function onExport() {
  const values = await gridApi.formApi.getValues();
  const fileName = `${$t('monitor.operlog.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportOperlog(toQuery(values), fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('monitor.operlog.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('monitor:operlog:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('monitor:operlog:remove')"
            danger
            @click="onClean"
          >
            {{ $t('monitor.operlog.clean') }}
          </Button>
          <Button
            v-if="hasPermission('monitor:operlog:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('monitor:operlog:query')"
          size="small"
          type="link"
          @click="onDetail(row)"
        >
          {{ $t('monitor.operlog.detail') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('monitor:operlog:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('monitor.operlog.delete')"
          :title="$t('monitor.operlog.confirmDelete')"
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
