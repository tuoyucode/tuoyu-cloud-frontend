<script lang="ts" setup>
import type { ProcessDrawerData } from './task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TaskApi } from '#/api/workflow/task';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listMyWaitingTask } from '#/api/workflow/task';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';

import ProcessDrawer from '../components/process-drawer.vue';
import { useTaskSearchSchema, useWaitingColumns } from './data';

defineOptions({ name: 'WorkflowTaskWaiting' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ProcessDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useTaskSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useWaitingColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await listMyWaitingTask({
            ...toPageQuery(page),
            ...formValues,
          }),
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<TaskApi.Task>,
});

function reload() {
  gridApi.query();
}

function onHandle(row: TaskApi.Task) {
  const data: ProcessDrawerData = {
    approve: true,
    businessId: row.businessId,
    instanceId: row.instanceId,
    taskId: row.id,
  };
  drawerApi.setData(data).open();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('workflow.task.waitingList')">
      <template #actions="{ row }">
        <Button size="small" type="link" @click="onHandle(row)">
          {{ $t('workflow.task.handle') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
