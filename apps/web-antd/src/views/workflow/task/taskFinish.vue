<script lang="ts" setup>
import type { ProcessDrawerData } from './task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TaskApi } from '#/api/workflow/task';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listMyFinishedTask } from '#/api/workflow/task';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';

import ProcessDrawer from '../components/process-drawer.vue';
import { useFinishedColumns, useTaskSearchSchema } from './data';

defineOptions({ name: 'WorkflowTaskFinish' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ProcessDrawer,
  destroyOnClose: true,
});

const [Grid] = useVbenVxeGrid({
  formOptions: {
    schema: useTaskSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useFinishedColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await listMyFinishedTask({
            ...toPageQuery(page),
            ...formValues,
          }),
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<TaskApi.HisTask>,
});

function onView(row: TaskApi.HisTask) {
  const data: ProcessDrawerData = {
    businessId: row.businessId,
    instanceId: row.instanceId,
    summary: {
      businessCode: row.businessCode,
      businessTitle: row.businessTitle,
      createByName: row.createByName,
      flowName: row.flowName,
      flowStatus: row.flowTaskStatus,
    },
  };
  drawerApi.setData(data).open();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer />
    <Grid :table-title="$t('workflow.task.finishedList')">
      <template #actions="{ row }">
        <Button size="small" type="link" @click="onView(row)">
          {{ $t('workflow.task.view') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
