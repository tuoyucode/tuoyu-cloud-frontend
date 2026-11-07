<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { GenApi } from '#/api/tool/gen';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  downloadGenCode,
  listGenTable,
  removeGenTable,
  syncGenTable,
} from '#/api/tool/gen';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

import {
  downloadFileName,
  EDIT_PAGE_PATH,
  toQuery,
  useColumns,
  useSearchSchema,
} from './data';
import ImportModal from './import-modal.vue';
import PreviewModal from './preview-modal.vue';

defineOptions({ name: 'ToolGen' });

const router = useRouter();

const [ImportTableModal, importModalApi] = useVbenModal({
  connectedComponent: ImportModal,
  destroyOnClose: true,
});

const [CodePreviewModal, previewModalApi] = useVbenModal({
  connectedComponent: PreviewModal,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用批量操作 */
const selectedCount = ref(0);

/** 正在下载、同步的行 */
const busy = ref(new Set<string>());

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
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listGenTable({
            ...toPageQuery(page),
            ...toQuery(formValues ?? {}),
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'tableId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<GenApi.Table>,
});

function selectedRows() {
  return gridApi.grid.getCheckboxRecords() as GenApi.Table[];
}

function updateSelectedCount() {
  selectedCount.value = selectedRows().length;
}

function reload() {
  gridApi.query();
}

function onImport() {
  importModalApi.open();
}

function onPreview(row: GenApi.Table) {
  previewModalApi
    .setData({ tableId: row.tableId, tableName: row.tableName })
    .open();
}

function onEdit(row: GenApi.Table) {
  router.push(`${EDIT_PAGE_PATH}/${row.tableId}`);
}

async function withBusy(tableId: string, action: () => Promise<void>) {
  busy.value.add(tableId);
  try {
    await action();
  } finally {
    busy.value.delete(tableId);
  }
}

async function onDownload(row: GenApi.Table) {
  await withBusy(row.tableId, () =>
    downloadGenCode([row.tableId], downloadFileName([row])),
  );
}

async function onBatchDownload() {
  const rows = selectedRows();
  if (rows.length === 0) {
    return;
  }
  await downloadGenCode(
    rows.map((row) => row.tableId),
    downloadFileName(rows),
  );
}

async function onSync(row: GenApi.Table) {
  await withBusy(row.tableId, async () => {
    await syncGenTable(row.tableId);
    message.success($t('tool.gen.synced', { name: row.tableName }));
    reload();
  });
}

async function onDelete(row: GenApi.Table) {
  await removeGenTable([row.tableId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = selectedRows();
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('tool.gen.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeGenTable(rows.map((row) => row.tableId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <ImportTableModal @success="reload" />
    <CodePreviewModal />
    <Grid :table-title="$t('tool.gen.list')">
      <template #toolbar-actions>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="hasPermission('tool:gen:import')"
            type="primary"
            @click="onImport"
          >
            {{ $t('tool.gen.import') }}
          </Button>
          <Button
            v-if="hasPermission('tool:gen:code')"
            :disabled="selectedCount === 0"
            @click="onBatchDownload"
          >
            {{ $t('tool.gen.batchDownload') }}
          </Button>
          <Button
            v-if="hasPermission('tool:gen:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('tool:gen:preview')"
          size="small"
          type="link"
          @click="onPreview(row)"
        >
          {{ $t('tool.gen.preview') }}
        </Button>
        <Button
          v-if="hasPermission('tool:gen:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('tool:gen:edit')"
          :description="$t('tool.gen.syncHelp')"
          :ok-text="$t('tool.gen.sync')"
          :title="$t('tool.gen.confirmSync', { name: row.tableName })"
          placement="left"
          @confirm="onSync(row)"
        >
          <Button :disabled="busy.has(row.tableId)" size="small" type="link">
            {{ $t('tool.gen.sync') }}
          </Button>
        </Popconfirm>
        <Button
          v-if="hasPermission('tool:gen:code')"
          :loading="busy.has(row.tableId)"
          size="small"
          type="link"
          @click="onDownload(row)"
        >
          {{ $t('tool.gen.download') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('tool:gen:remove')"
          :description="$t('tool.gen.deleteHelp')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('tool.gen.delete')"
          :title="$t('crud.confirmDelete', { name: row.tableName })"
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
