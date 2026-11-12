<script lang="ts" setup>
import type { GenApi } from '@tuoyu/shared/api/tool/gen';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  downloadGenCode,
  listGenTable,
  removeGenTable,
  syncGenTable,
} from '@tuoyu/shared/api/tool/gen';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

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
    ElMessage.success($t('tool.gen.synced', { name: row.tableName }));
    reload();
  });
}

async function onDelete(row: GenApi.Table) {
  await removeGenTable([row.tableId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = selectedRows();
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('tool.gen.confirmBatchDelete', { count: rows.length }),
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
  await removeGenTable(rows.map((row) => row.tableId));
  ElMessage.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <ImportTableModal @success="reload" />
    <CodePreviewModal />
    <Grid :table-title="$t('tool.gen.list')">
      <template #toolbar-actions>
        <div class="flex flex-wrap gap-2">
          <ElButton
            v-if="hasPermission('tool:gen:import')"
            type="primary"
            @click="onImport"
          >
            {{ $t('tool.gen.import') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('tool:gen:code')"
            :disabled="selectedCount === 0"
            @click="onBatchDownload"
          >
            {{ $t('tool.gen.batchDownload') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('tool:gen:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('tool:gen:preview')"
          link
          size="small"
          type="primary"
          @click="onPreview(row)"
        >
          {{ $t('tool.gen.preview') }}
        </ElButton>
        <ElButton
          v-if="hasPermission('tool:gen:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('tool:gen:edit')"
          :title="$t('tool.gen.confirmSync', { name: row.tableName })"
          placement="left"
          width="300"
          @confirm="onSync(row)"
        >
          <template #reference>
            <ElButton
              :disabled="busy.has(row.tableId)"
              link
              size="small"
              type="primary"
            >
              {{ $t('tool.gen.sync') }}
            </ElButton>
          </template>
          <!-- 气泡确认框只有标题，说明放在按钮上方 -->
          <template #actions="{ confirm, cancel }">
            <p class="mb-2 text-left text-xs text-muted-foreground">
              {{ $t('tool.gen.syncHelp') }}
            </p>
            <ElButton size="small" @click="cancel">
              {{ $t('common.cancel') }}
            </ElButton>
            <ElButton size="small" type="primary" @click="confirm">
              {{ $t('tool.gen.sync') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-if="hasPermission('tool:gen:code')"
          :loading="busy.has(row.tableId)"
          link
          size="small"
          type="primary"
          @click="onDownload(row)"
        >
          {{ $t('tool.gen.download') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('tool:gen:remove')"
          :title="$t('crud.confirmDelete', { name: row.tableName })"
          placement="left"
          width="280"
          @confirm="onDelete(row)"
        >
          <template #reference>
            <ElButton link size="small" type="danger">
              {{ $t('common.delete') }}
            </ElButton>
          </template>
          <template #actions="{ confirm, cancel }">
            <p class="mb-2 text-left text-xs text-muted-foreground">
              {{ $t('tool.gen.deleteHelp') }}
            </p>
            <ElButton size="small" @click="cancel">
              {{ $t('common.cancel') }}
            </ElButton>
            <ElButton size="small" type="danger" @click="confirm">
              {{ $t('tool.gen.delete') }}
            </ElButton>
          </template>
        </ElPopconfirm>
      </template>
    </Grid>
  </Page>
</template>
