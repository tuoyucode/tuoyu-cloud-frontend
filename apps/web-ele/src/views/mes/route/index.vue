<script lang="ts" setup>
import type { RouteApi } from '@tuoyu/shared/api/mes/route';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportRoute,
  listRoute,
  removeRoute,
} from '@tuoyu/shared/api/mes/route';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import MesImportModal from '../_shared/import-modal.vue';
import { useColumns, useSearchSchema } from './data';
import RouteDrawer from './route-drawer.vue';

defineOptions({ name: 'MesRoute' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: RouteDrawer,
  destroyOnClose: true,
});

const [ImportModal, importModalApi] = useVbenModal({
  connectedComponent: MesImportModal,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

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
          return await listRoute({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'routeId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<RouteApi.Route>,
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

function onEdit(row: RouteApi.Route) {
  drawerApi.setData({ routeId: row.routeId }).open();
}

async function onDelete(row: RouteApi.Route) {
  await removeRoute([row.routeId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as RouteApi.Route[];
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
  await removeRoute(rows.map((row) => row.routeId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

function onImport() {
  importModalApi.open();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.route.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportRoute(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <ImportModal
      :title="$t('mes.route.title')"
      resource="route"
      @success="reload"
    />
    <Grid :table-title="$t('mes.route.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:route:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.route.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:route:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton v-if="hasPermission('mes:route:import')" @click="onImport">
            {{ $t('mes.import.button') }}
          </ElButton>
          <ElButton v-if="hasPermission('mes:route:export')" @click="onExport">
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:route:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('mes:route:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.route.delete')"
          :title="
            $t('crud.confirmDelete', {
              name: `${row.routeName} ${row.routeVersion}`,
            })
          "
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
