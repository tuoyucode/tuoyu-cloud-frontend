<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SpelApi } from '#/api/workflow/spel';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listSpel, removeSpel } from '#/api/workflow/spel';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

import { useColumns, useSearchSchema } from './data';
import SpelDrawer from './spel-drawer.vue';

defineOptions({ name: 'WorkflowSpel' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: SpelDrawer,
  destroyOnClose: true,
});

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
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listSpel({
            ...toPageQuery(page),
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<SpelApi.Spel>,
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

function onEdit(row: SpelApi.Spel) {
  drawerApi.setData({ id: row.id }).open();
}

async function onDelete(row: SpelApi.Spel) {
  await removeSpel([row.id]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as SpelApi.Spel[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeSpel(rows.map((row) => row.id));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('workflow.spel.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('workflow:spel:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('workflow.spel.create') }}
          </Button>
          <Button
            v-if="hasPermission('workflow:spel:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #viewSpel="{ row }">
        <code class="font-mono text-xs">{{ row.viewSpel }}</code>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('workflow:spel:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('workflow:spel:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('workflow.spel.delete')"
          :title="
            $t('crud.confirmDelete', { name: row.remark || row.viewSpel })
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
