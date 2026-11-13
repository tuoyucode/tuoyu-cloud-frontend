<script lang="ts" setup>
import type { OperationTaskApi } from '@tuoyu/shared/api/mes/operationTask';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  completeOperationTask,
  getOperationTaskLogs,
  listOperationTask,
} from '@tuoyu/shared/api/mes/operationTask';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import StatusLogModal from '#/views/mes/workorder/status-log-modal.vue';

import { useColumns, useSearchSchema } from './data';
import DispatchModal from './dispatch-modal.vue';

defineOptions({ name: 'MesOperationTask' });

/** 工单可以派工的状态 */
const DISPATCHABLE_WORKORDER = new Set(['in_progress', 'released']);

const [Dispatch, dispatchApi] = useVbenModal({
  connectedComponent: DispatchModal,
});

const [Logs, logsApi] = useVbenModal({ connectedComponent: StatusLogModal });

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
          await listOperationTask({
            ...toPageQuery(page, sorts),
            ...formValues,
          }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'taskId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<OperationTaskApi.Task>,
});

function reload() {
  gridApi.query();
}

function canDispatch(row: OperationTaskApi.Task) {
  return (
    hasPermission('mes:operationTask:dispatch') &&
    ['dispatched', 'pending'].includes(row.taskStatus) &&
    DISPATCHABLE_WORKORDER.has(row.workorderStatus ?? '')
  );
}

function canComplete(row: OperationTaskApi.Task) {
  return (
    hasPermission('mes:operationTask:complete') &&
    row.taskStatus === 'in_progress'
  );
}

function onDispatch(row: OperationTaskApi.Task) {
  dispatchApi.setData(row).open();
}

async function onComplete(row: OperationTaskApi.Task) {
  await completeOperationTask(row.taskId);
  ElMessage.success($t('mes.operationTask.completed'));
  reload();
}

function onLogs(row: OperationTaskApi.Task) {
  logsApi
    .setData({
      load: () => getOperationTaskLogs(row.taskId),
      statusType: 'TaskStatus',
      title: `${$t('mes.operationTask.logs')} ${row.taskCode}`,
    })
    .open();
}
</script>

<template>
  <Page auto-content-height>
    <Dispatch @success="reload" />
    <Logs />
    <Grid :table-title="$t('mes.operationTask.list')">
      <template #status="{ row }">
        <EnumTag :value="row.taskStatus" type="TaskStatus" />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="canDispatch(row)"
          link
          size="small"
          type="primary"
          @click="onDispatch(row)"
        >
          {{ $t('mes.operationTask.dispatch') }}
        </ElButton>
        <ElPopconfirm
          v-if="canComplete(row)"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.operationTask.completeTask')"
          :title="
            $t('mes.operationTask.confirmComplete', {
              name: `${row.seqNo} ${row.operationName}`,
            })
          "
          placement="left"
          width="300"
          @confirm="onComplete(row)"
        >
          <template #reference>
            <ElButton link size="small" type="primary">
              {{ $t('mes.operationTask.completeTask') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-if="hasPermission('mes:operationTask:query')"
          link
          size="small"
          type="primary"
          @click="onLogs(row)"
        >
          {{ $t('mes.operationTask.logs') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
