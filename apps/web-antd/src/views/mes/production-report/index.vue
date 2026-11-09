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
import { Button, message, Popconfirm } from 'ant-design-vue';

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
  message.success($t('mes.productionReport.confirmed'));
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
        message.success($t('mes.productionReport.cancelled'));
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
        <Button
          v-if="hasPermission('mes:productionReport:export')"
          @click="onExport"
        >
          {{ $t('crud.export') }}
        </Button>
      </template>

      <template #status="{ row }">
        <EnumTag :value="row.reportStatus" type="ReportStatus" />
      </template>

      <template #actions="{ row }">
        <Popconfirm
          v-if="
            isReported(row) && hasPermission('mes:productionReport:confirm')
          "
          :ok-text="$t('mes.productionReport.confirmReport')"
          :title="
            $t('mes.productionReport.confirmTitle', { code: row.reportCode })
          "
          placement="left"
          @confirm="onConfirm(row)"
        >
          <Button size="small" type="link">
            {{ $t('mes.productionReport.confirmReport') }}
          </Button>
        </Popconfirm>
        <Button
          v-if="isReported(row) && hasPermission('mes:productionReport:cancel')"
          danger
          size="small"
          type="link"
          @click="onCancel(row)"
        >
          {{ $t('mes.productionReport.cancelReport') }}
        </Button>
        <Button
          v-if="hasPermission('mes:productionReport:query')"
          size="small"
          type="link"
          @click="onLogs(row)"
        >
          {{ $t('mes.productionReport.logs') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
