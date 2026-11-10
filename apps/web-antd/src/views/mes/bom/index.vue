<script lang="ts" setup>
import type { BomApi } from '@tuoyu/shared/api/mes/bom';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import { exportBom, listBom, removeBom } from '@tuoyu/shared/api/mes/bom';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import MesImportModal from '../_shared/import-modal.vue';
import BomDrawer from './bom-drawer.vue';
import { useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MesBom' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: BomDrawer,
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
          return await listBom({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'bomId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<BomApi.Bom>,
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

function onEdit(row: BomApi.Bom) {
  drawerApi.setData({ bomId: row.bomId }).open();
}

async function onDelete(row: BomApi.Bom) {
  await removeBom([row.bomId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as BomApi.Bom[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeBom(rows.map((row) => row.bomId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

function onImport() {
  importModalApi.open();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.bom.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportBom(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <ImportModal
      :title="$t('mes.bom.title')"
      resource="bom"
      @success="reload"
    />
    <Grid :table-title="$t('mes.bom.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:bom:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.bom.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:bom:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button v-if="hasPermission('mes:bom:import')" @click="onImport">
            {{ $t('mes.import.button') }}
          </Button>
          <Button v-if="hasPermission('mes:bom:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:bom:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:bom:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.bom.delete')"
          :title="
            $t('crud.confirmDelete', {
              name: `${row.bomCode} ${row.bomVersion}`,
            })
          "
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
