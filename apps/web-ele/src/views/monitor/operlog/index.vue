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
import { ElButton, ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus';

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

/** 危险操作的确认框；取消时返回 false */
async function confirmDanger(
  content: string,
  title: string,
  confirmText: string,
) {
  try {
    await ElMessageBox.confirm(content, title, {
      cancelButtonText: $t('common.cancel'),
      confirmButtonClass: 'el-button--danger',
      confirmButtonText: confirmText,
      type: 'warning',
    });
    return true;
  } catch {
    return false;
  }
}

async function onDelete(row: OperlogApi.Operlog) {
  await removeOperlog([row.operId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as OperlogApi.Operlog[];
  if (rows.length === 0) {
    return;
  }
  const confirmed = await confirmDanger(
    $t('crud.confirmBatchDelete', { count: rows.length }),
    $t('crud.batchDelete'),
    $t('crud.batchDelete'),
  );
  if (!confirmed) {
    return;
  }
  await removeOperlog(rows.map((row) => row.operId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onClean() {
  const confirmed = await confirmDanger(
    $t('monitor.operlog.confirmClean'),
    $t('monitor.operlog.cleanTitle'),
    $t('monitor.operlog.clean'),
  );
  if (!confirmed) {
    return;
  }
  await cleanOperlog();
  ElMessage.success($t('monitor.operlog.cleaned'));
  reload();
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
          <ElButton
            v-if="hasPermission('monitor:operlog:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('monitor:operlog:remove')"
            plain
            type="danger"
            @click="onClean"
          >
            {{ $t('monitor.operlog.clean') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('monitor:operlog:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('monitor:operlog:query')"
          link
          size="small"
          type="primary"
          @click="onDetail(row)"
        >
          {{ $t('monitor.operlog.detail') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('monitor:operlog:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('monitor.operlog.delete')"
          :title="$t('monitor.operlog.confirmDelete')"
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
