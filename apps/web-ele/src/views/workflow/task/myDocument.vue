<script lang="ts" setup>
import type { InstanceApi } from '@tuoyu/shared/api/workflow/instance';
import type { ProcessDrawerData } from '@tuoyu/shared/pages/workflow/task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  cancelInstance,
  listMyInstance,
  removeFinishedInstance,
  removeInstance,
} from '@tuoyu/shared/api/workflow/instance';
import {
  businessLabel,
  canCancel,
  isFinishedStatus,
} from '@tuoyu/shared/pages/workflow/task-utils';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import ActionConfirm from '../components/action-confirm.vue';
import ProcessDrawer from '../components/process-drawer.vue';
import { useInstanceColumns, useInstanceSearchSchema } from './data';

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
    formPath: row.formPath,
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
  ElMessage.success($t('workflow.task.cancelled'));
  reload();
}

async function onDelete(row: InstanceApi.Instance) {
  await (isFinishedStatus(row.flowStatus)
    ? removeFinishedInstance([row.id])
    : removeInstance([row.id]));
  ElMessage.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('workflow.task.myDocumentList')">
      <template #actions="{ row }">
        <ElButton link size="small" type="primary" @click="onView(row)">
          {{ $t('workflow.task.view') }}
        </ElButton>
        <ActionConfirm
          v-if="canCancel(row.flowStatus)"
          :confirm-text="$t('workflow.task.cancel')"
          :description="$t('workflow.task.cancelHelp')"
          :title="
            $t('workflow.task.confirmCancel', { name: businessLabel(row) })
          "
          @confirm="onCancel(row)"
        >
          <ElButton link size="small" type="primary">
            {{ $t('workflow.task.cancel') }}
          </ElButton>
        </ActionConfirm>
        <ActionConfirm
          v-if="
            !canCancel(row.flowStatus) &&
            hasPermission('workflow:instance:remove')
          "
          :confirm-text="$t('workflow.task.delete')"
          :description="$t('workflow.task.deleteHelp')"
          :title="$t('crud.confirmDelete', { name: businessLabel(row) })"
          danger
          @confirm="onDelete(row)"
        >
          <ElButton link size="small" type="danger">
            {{ $t('common.delete') }}
          </ElButton>
        </ActionConfirm>
      </template>
    </Grid>
  </Page>
</template>
