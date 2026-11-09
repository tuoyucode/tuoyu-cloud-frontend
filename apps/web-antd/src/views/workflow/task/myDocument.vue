<script lang="ts" setup>
import type { InstanceApi } from '@tuoyu/shared/api/workflow/instance';

import type { ProcessDrawerData } from './task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  cancelInstance,
  listMyInstance,
  removeFinishedInstance,
  removeInstance,
} from '@tuoyu/shared/api/workflow/instance';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import ProcessDrawer from '../components/process-drawer.vue';
import { useInstanceColumns, useInstanceSearchSchema } from './data';
import { businessLabel, canCancel, isFinishedStatus } from './task-utils';

defineOptions({ name: 'WorkflowMyDocument' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ProcessDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useInstanceSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useInstanceColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await listMyInstance({
            ...toPageQuery(page),
            ...formValues,
          }),
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<InstanceApi.Instance>,
});

function reload() {
  gridApi.query();
}

function onView(row: InstanceApi.Instance) {
  const data: ProcessDrawerData = {
    businessId: row.businessId,
    instanceId: row.id,
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

async function onCancel(row: InstanceApi.Instance) {
  await cancelInstance(row.businessId);
  message.success($t('workflow.task.cancelled'));
  reload();
}

async function onDelete(row: InstanceApi.Instance) {
  await (isFinishedStatus(row.flowStatus)
    ? removeFinishedInstance([row.id])
    : removeInstance([row.id]));
  message.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('workflow.task.myDocumentList')">
      <template #actions="{ row }">
        <Button size="small" type="link" @click="onView(row)">
          {{ $t('workflow.task.view') }}
        </Button>
        <Popconfirm
          v-if="canCancel(row.flowStatus)"
          :description="$t('workflow.task.cancelHelp')"
          :ok-text="$t('workflow.task.cancel')"
          :title="
            $t('workflow.task.confirmCancel', { name: businessLabel(row) })
          "
          placement="left"
          @confirm="onCancel(row)"
        >
          <Button size="small" type="link">
            {{ $t('workflow.task.cancel') }}
          </Button>
        </Popconfirm>
        <Popconfirm
          v-if="
            !canCancel(row.flowStatus) &&
            hasPermission('workflow:instance:remove')
          "
          :description="$t('workflow.task.deleteHelp')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('workflow.task.delete')"
          :title="$t('crud.confirmDelete', { name: businessLabel(row) })"
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
