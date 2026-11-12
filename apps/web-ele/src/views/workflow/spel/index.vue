<script lang="ts" setup>
import type { SpelApi } from '@tuoyu/shared/api/workflow/spel';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { listSpel, removeSpel } from '@tuoyu/shared/api/workflow/spel';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

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
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as SpelApi.Spel[];
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
  await removeSpel(rows.map((row) => row.id));
  ElMessage.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('workflow.spel.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('workflow:spel:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('workflow.spel.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('workflow:spel:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
      </template>

      <template #viewSpel="{ row }">
        <code class="font-mono text-xs">{{ row.viewSpel }}</code>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('workflow:spel:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('workflow:spel:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('workflow.spel.delete')"
          :title="
            $t('crud.confirmDelete', { name: row.remark || row.viewSpel })
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
