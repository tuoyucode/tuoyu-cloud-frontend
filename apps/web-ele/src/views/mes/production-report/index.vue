<script lang="ts" setup>
import type { ProductionReportApi } from '@tuoyu/shared/api/mes/productionReport';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  cancelProductionReport,
  confirmProductionReport,
  exportProductionReport,
  getProductionReportLogs,
  listProductionReport,
} from '@tuoyu/shared/api/mes/productionReport';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import ReasonModal from '#/views/mes/workorder/reason-modal.vue';
import StatusLogModal from '#/views/mes/workorder/status-log-modal.vue';

import { toQuery, useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MesProductionReport' });

const [ReasonDialog, reasonApi] = useVbenModal({
  connectedComponent: ReasonModal,
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
          await listProductionReport({
            ...toPageQuery(page, sorts),
            ...toQuery(formValues),
          }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'reportId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<ProductionReportApi.Report>,
});

function reload() {
  gridApi.query();
}

function isReported(row: ProductionReportApi.Report) {
  return row.reportStatus === 'reported';
}

async function onConfirm(row: ProductionReportApi.Report) {
  await confirmProductionReport(row.reportId);
  ElMessage.success($t('mes.productionReport.confirmed'));
  reload();
}

function onCancel(row: ProductionReportApi.Report) {
  const okText = $t('mes.productionReport.cancelReport');
  reasonApi
    .setData({
      description: $t('mes.productionReport.cancelHelp'),
      label: $t('mes.productionReport.cancelReason'),
      okText,
      required: true,
      async submit(reason: string) {
        await cancelProductionReport(row.reportId, reason);
        ElMessage.success($t('mes.productionReport.cancelled'));
        reload();
      },
      title: `${okText} ${row.reportCode}`,
    })
    .open();
}

function onLogs(row: ProductionReportApi.Report) {
  logsApi
    .setData({
      load: () => getProductionReportLogs(row.reportId),
      statusType: 'ReportStatus',
      title: `${$t('mes.productionReport.logs')} ${row.reportCode}`,
    })
    .open();
}

async function onExport() {
  const values = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.productionReport.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportProductionReport(toQuery(values), fileName);
}
</script>

<template>
  <Page auto-content-height>
    <ReasonDialog />
    <Logs />
    <Grid :table-title="$t('mes.productionReport.list')">
      <template #toolbar-actions>
        <ElButton
          v-if="hasPermission('mes:productionReport:export')"
          @click="onExport"
        >
          {{ $t('crud.export') }}
        </ElButton>
      </template>

      <template #status="{ row }">
        <EnumTag :value="row.reportStatus" type="ReportStatus" />
      </template>

      <template #actions="{ row }">
        <ElPopconfirm
          v-if="
            isReported(row) && hasPermission('mes:productionReport:confirm')
          "
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.productionReport.confirmReport')"
          :title="
            $t('mes.productionReport.confirmTitle', { code: row.reportCode })
          "
          placement="left"
          width="260"
          @confirm="onConfirm(row)"
        >
          <template #reference>
            <ElButton link size="small" type="primary">
              {{ $t('mes.productionReport.confirmReport') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-if="isReported(row) && hasPermission('mes:productionReport:cancel')"
          link
          size="small"
          type="danger"
          @click="onCancel(row)"
        >
          {{ $t('mes.productionReport.cancelReport') }}
        </ElButton>
        <ElButton
          v-if="hasPermission('mes:productionReport:query')"
          link
          size="small"
          type="primary"
          @click="onLogs(row)"
        >
          {{ $t('mes.productionReport.logs') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
