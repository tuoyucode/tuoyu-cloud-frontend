<script lang="ts" setup>
import type { MaterialApi } from '@tuoyu/shared/api/mes/material';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportMaterial,
  listMaterial,
  removeMaterial,
  updateMaterial,
} from '@tuoyu/shared/api/mes/material';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import MesImportModal from '../_shared/import-modal.vue';
import { useColumns, useSearchSchema } from './data';
import MaterialDrawer from './material-drawer.vue';

defineOptions({ name: 'MesMaterial' });

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: MaterialDrawer,
  destroyOnClose: true,
});

const [ImportModal, importModalApi] = useVbenModal({
  connectedComponent: MesImportModal,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    schema: useSearchSchema(),
    showCollapseButton: true,
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
          return await listMaterial({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'materialId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<MaterialApi.Material>,
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

function onEdit(row: MaterialApi.Material) {
  drawerApi.setData({ materialId: row.materialId }).open();
}

async function onDelete(row: MaterialApi.Material) {
  await removeMaterial([row.materialId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as MaterialApi.Material[];
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
  await removeMaterial(rows.map((row) => row.materialId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onStatusChange(row: MaterialApi.Material, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.materialId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateMaterial({ ...row, status });
    row.status = status;
    ElMessage.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.materialName,
      }),
    );
  } finally {
    switching.value.delete(row.materialId);
  }
}

function onImport() {
  importModalApi.open();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.material.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportMaterial(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <ImportModal
      :title="$t('mes.material.title')"
      resource="material"
      @success="reload"
    />
    <Grid :table-title="$t('mes.material.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:material:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.material.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:material:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:material:import')"
            @click="onImport"
          >
            {{ $t('mes.import.button') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:material:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #materialType="{ row }">
        <EnumTag :value="row.materialType" type="MaterialType" />
      </template>

      <template #traceMode="{ row }">
        <EnumTag :value="row.traceMode" type="TraceMode" />
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!hasPermission('mes:material:edit')"
          :loading="switching.has(row.materialId)"
          :model-value="row.status === STATUS_NORMAL"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:material:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('mes:material:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.material.delete')"
          :title="$t('crud.confirmDelete', { name: row.materialName })"
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
