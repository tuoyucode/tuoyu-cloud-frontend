<script lang="ts" setup>
import type { DefectApi } from '@tuoyu/shared/api/mes/defect';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportDefect,
  getDefectLogs,
  listDefect,
} from '@tuoyu/shared/api/mes/defect';
import { cancelInstance } from '@tuoyu/shared/api/workflow/instance';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import {
  approvalDrawerData,
  hasApproval,
  isApproving,
} from '#/views/mes/material-request/approval';
import StatusLogModal from '#/views/mes/material-request/status-log-modal.vue';
import ProcessDrawer from '#/views/workflow/components/process-drawer.vue';

import { useColumns, useSearchSchema } from './data';
import DefectDrawer from './defect-drawer.vue';
import HandleModal from './handle-modal.vue';

defineOptions({ name: 'MesDefect' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: DefectDrawer,
  destroyOnClose: true,
});
const [Handle, handleApi] = useVbenModal({
  connectedComponent: HandleModal,
  destroyOnClose: true,
});
const [Logs, logsApi] = useVbenModal({
  connectedComponent: StatusLogModal,
  destroyOnClose: true,
});
const [Approval, approvalApi] = useVbenDrawer({
  connectedComponent: ProcessDrawer,
  destroyOnClose: true,
});

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
          await listDefect({ ...toPageQuery(page, sorts), ...formValues }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'defectId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DefectApi.Defect>,
});

function reload() {
  gridApi.query();
}

function isPending(row: DefectApi.Defect) {
  return row.handleStatus === 'pending';
}

function onHandle(row: DefectApi.Defect) {
  handleApi.setData(row).open();
}

function onLogs(row: DefectApi.Defect) {
  logsApi
    .setData({
      enumType: 'DefectHandleStatus',
      load: () => getDefectLogs(row.defectId),
      title: $t('mes.defect.logsTitle', { code: row.defectCode }),
    })
    .open();
}

/** 审批记录与流程图（框架的流程抽屉，只读） */
function onApproval(row: DefectApi.Defect) {
  if (!row.approvalBusinessId) {
    return;
  }
  approvalApi
    .setData(approvalDrawerData(row.approvalBusinessId, row.defectCode))
    .open();
}

/** 撤销审批：只有发起人可以撤销（工作流校验），撤销后回到待处置 */
function onWithdraw(row: DefectApi.Defect) {
  const businessId = row.approvalBusinessId;
  if (!businessId) {
    return;
  }
  Modal.confirm({
    content: $t('mes.defect.confirmWithdraw', { code: row.defectCode }),
    okButtonProps: { danger: true },
    okText: $t('mes.defect.withdrawApproval'),
    async onOk() {
      await cancelInstance(businessId);
      message.success($t('mes.defect.withdrawn'));
      reload();
    },
  });
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.defect.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportDefect(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Handle @success="reload" />
    <Logs />
    <Approval />
    <Grid :table-title="$t('mes.defect.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:defect:add')"
            type="primary"
            @click="drawerApi.open()"
          >
            {{ $t('mes.defect.create') }}
          </Button>
          <Button v-if="hasPermission('mes:defect:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #sourceType="{ row }">
        <EnumTag :value="row.sourceType" type="DefectSource" />
      </template>

      <template #defectLevel="{ row }">
        <EnumTag :value="row.defectLevel" type="DefectLevel" />
      </template>

      <template #handleStatus="{ row }">
        <EnumTag :value="row.handleStatus" type="DefectHandleStatus" />
      </template>

      <template #handleMethod="{ row }">
        <EnumTag :value="row.handleMethod" type="DefectHandleMethod" />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="isPending(row) && hasPermission('mes:defect:handle')"
          size="small"
          type="link"
          @click="onHandle(row)"
        >
          {{ $t('mes.defect.handle') }}
        </Button>
        <Button
          v-if="hasApproval(row) && hasPermission('mes:defect:query')"
          size="small"
          type="link"
          @click="onApproval(row)"
        >
          {{ $t('mes.defect.viewApproval') }}
        </Button>
        <Button
          v-if="
            isApproving(row.handleStatus) && hasPermission('mes:defect:handle')
          "
          danger
          size="small"
          type="link"
          @click="onWithdraw(row)"
        >
          {{ $t('mes.defect.withdrawApproval') }}
        </Button>
        <Button
          v-if="hasPermission('mes:defect:query')"
          size="small"
          type="link"
          @click="onLogs(row)"
        >
          {{ $t('mes.defect.logs') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
