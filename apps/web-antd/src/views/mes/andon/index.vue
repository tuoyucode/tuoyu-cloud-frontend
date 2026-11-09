<script lang="ts" setup>
import type { AndonAction } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AndonApi } from '#/api/mes/andon';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { formatDate } from '@vben/utils';

import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { exportAndon, listAndon, processAndon } from '#/api/mes/andon';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

import EnumTag from '../_shared/enum-tag.vue';
import AndonActionModal from './andon-action-modal.vue';
import AndonDetailDrawer from './andon-detail-drawer.vue';
import AndonReportDrawer from './andon-report-drawer.vue';
import { toQuery, useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MesAndon' });

const userStore = useUserStore();

const [ReportDrawer, reportDrawerApi] = useVbenDrawer({
  connectedComponent: AndonReportDrawer,
  destroyOnClose: true,
});

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: AndonDetailDrawer,
  destroyOnClose: true,
});

const [ActionModal, actionModalApi] = useVbenModal({
  connectedComponent: AndonActionModal,
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
          await listAndon({
            ...toPageQuery(page, sorts),
            ...toQuery(formValues),
          }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'eventId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<AndonApi.Event>,
});

function reload() {
  gridApi.query();
}

function isMe(userId?: string) {
  return (
    Boolean(userId) && String(userId) === String(userStore.userInfo?.userId)
  );
}

/** 有派单权限的人可以代替处理人处理、代替上报人关闭（与后端规则一致） */
const canAssign = () => hasPermission('mes:andon:assign');

function showAssign(row: AndonApi.Event) {
  return canAssign() && ['assigned', 'reported'].includes(row.eventStatus);
}

function showProcess(row: AndonApi.Event) {
  return (
    hasPermission('mes:andon:process') &&
    row.eventStatus === 'assigned' &&
    (isMe(row.handlerUserId) || canAssign())
  );
}

function showResolve(row: AndonApi.Event) {
  return (
    hasPermission('mes:andon:process') &&
    row.eventStatus === 'processing' &&
    (isMe(row.handlerUserId) || canAssign())
  );
}

function showClose(row: AndonApi.Event) {
  if (!hasPermission('mes:andon:close')) {
    return false;
  }
  if (row.eventStatus === 'reported') {
    return true;
  }
  return (
    row.eventStatus === 'resolved' && (isMe(row.reportUserId) || canAssign())
  );
}

function onReport() {
  reportDrawerApi.open();
}

function onDetail(row: AndonApi.Event) {
  detailDrawerApi.setData({ eventId: row.eventId }).open();
}

function openAction(action: AndonAction, row: AndonApi.Event) {
  actionModalApi.setData({ action, event: row }).open();
}

async function onProcess(row: AndonApi.Event) {
  await processAndon(row.eventId);
  message.success($t('mes.andon.processing'));
  reload();
}

async function onExport() {
  const query = toQuery(await gridApi.formApi.getValues());
  const fileName = `${$t('mes.andon.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportAndon(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <ReportDrawer @success="reload" />
    <DetailDrawer />
    <ActionModal @success="reload" />
    <Grid :table-title="$t('mes.andon.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:andon:add')"
            danger
            type="primary"
            @click="onReport"
          >
            {{ $t('mes.andon.reportTitle') }}
          </Button>
          <Button v-if="hasPermission('mes:andon:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #eventLevel="{ row }">
        <EnumTag :value="row.eventLevel" type="AndonLevel" />
      </template>

      <template #eventType="{ row }">
        <EnumTag :value="row.eventType" type="AndonType" />
      </template>

      <template #eventStatus="{ row }">
        <EnumTag :value="row.eventStatus" type="AndonStatus" />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:andon:query')"
          size="small"
          type="link"
          @click="onDetail(row)"
        >
          {{ $t('mes.andon.detail') }}
        </Button>
        <Button
          v-if="showAssign(row)"
          size="small"
          type="link"
          @click="openAction('assign', row)"
        >
          {{
            row.eventStatus === 'assigned'
              ? $t('mes.andon.reassign')
              : $t('mes.andon.assign')
          }}
        </Button>
        <Popconfirm
          v-if="showProcess(row)"
          :ok-text="$t('mes.andon.process')"
          :title="$t('mes.andon.confirmProcess', { code: row.eventCode })"
          placement="left"
          @confirm="onProcess(row)"
        >
          <Button size="small" type="link">
            {{ $t('mes.andon.process') }}
          </Button>
        </Popconfirm>
        <Button
          v-if="showResolve(row)"
          size="small"
          type="link"
          @click="openAction('resolve', row)"
        >
          {{ $t('mes.andon.resolve') }}
        </Button>
        <Button
          v-if="showClose(row)"
          size="small"
          type="link"
          @click="openAction('close', row)"
        >
          {{ $t('mes.andon.close') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
