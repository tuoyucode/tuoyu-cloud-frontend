<script lang="ts" setup>
import type { ProcessDrawerData } from './task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TaskApi } from '#/api/workflow/task';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listMyCopyTask } from '#/api/workflow/task';
import { $t } from '#/locales';

import ProcessDrawer from '../components/process-drawer.vue';
import { useCopyColumns, useTaskSearchSchema } from './data';

defineOptions({ name: 'WorkflowTaskCopyList' });

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
    columns: useCopyColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await listMyCopyTask({
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<TaskApi.Task>,
});

function onView(row: TaskApi.Task) {
  const data: ProcessDrawerData = {
    businessId: row.businessId,
    instanceId: row.instanceId,
    summary: {
      businessCode: row.businessCode,
      businessTitle: row.businessTitle,
      createByName: row.createByName,
      createTime: row.createTime,
      flowName: row.flowName,
      flowStatus: row.flowStatus,
      nodeName: row.nodeName,
    },
  };
  drawerApi.setData(data).open();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer />
    <Grid :table-title="$t('workflow.task.copyList')">
      <template #actions="{ row }">
        <Button size="small" type="link" @click="onView(row)">
          {{ $t('workflow.task.view') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
