<script lang="ts" setup>
import type { AndonApi } from '@tuoyu/shared/api/mes/andon';

import type { AndonAction } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { formatDate } from '@vben/utils';

import {
  exportAndon,
  listAndon,
  processAndon,
} from '@tuoyu/shared/api/mes/andon';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElPopconfirm,
  ElTag,
  ElTooltip,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import { useAutoRefresh } from '../_shared/use-auto-refresh';
import AndonActionModal from './andon-action-modal.vue';
import AndonDetailDrawer from './andon-detail-drawer.vue';
import AndonReportDrawer from './andon-report-drawer.vue';
import { overdueDeadline, toQuery, useColumns, useSearchSchema } from './data';

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

// 超时升级由后台定时检查，列表每 30 秒刷新一次（停留在当前页；页面不可见时暂停）
useAutoRefresh(() => gridApi.query());

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

/** 升级列的提示：响应、解决的截止时间 */
function escalationTip(row: AndonApi.Event) {
  return [
    row.responseDueTime
      ? $t('mes.andon.responseDue', { time: row.responseDueTime })
      : '',
    row.resolveDueTime
      ? $t('mes.andon.resolveDue', { time: row.resolveDueTime })
      : '',
  ]
    .filter(Boolean)
    .join('；');
}

async function onProcess(row: AndonApi.Event) {
  await processAndon(row.eventId);
  ElMessage.success($t('mes.andon.processing'));
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
          <ElButton
            v-if="hasPermission('mes:andon:add')"
            type="danger"
            @click="onReport"
          >
            {{ $t('mes.andon.reportTitle') }}
          </ElButton>
          <ElButton v-if="hasPermission('mes:andon:export')" @click="onExport">
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #eventLevel="{ row }">
        <EnumTag :value="row.eventLevel" type="AndonLevel" />
      </template>

      <template #escalation="{ row }">
        <ElTooltip
          :content="escalationTip(row)"
          :disabled="!escalationTip(row)"
          placement="top"
        >
          <span>
            <ElTag v-if="(row.escalateCount ?? 0) > 0" type="danger">
              {{ $t('mes.andon.escalatedTimes', { count: row.escalateCount }) }}
            </ElTag>
            <ElTag v-else-if="overdueDeadline(row)" type="warning">
              {{ $t('mes.andon.overdue') }}
            </ElTag>
            <span v-else class="text-muted-foreground">-</span>
          </span>
        </ElTooltip>
      </template>

      <template #eventType="{ row }">
        <EnumTag :value="row.eventType" type="AndonType" />
      </template>

      <template #eventStatus="{ row }">
        <EnumTag :value="row.eventStatus" type="AndonStatus" />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:andon:query')"
          link
          size="small"
          type="primary"
          @click="onDetail(row)"
        >
          {{ $t('mes.andon.detail') }}
        </ElButton>
        <ElButton
          v-if="showAssign(row)"
          link
          size="small"
          type="primary"
          @click="openAction('assign', row)"
        >
          {{
            row.eventStatus === 'assigned'
              ? $t('mes.andon.reassign')
              : $t('mes.andon.assign')
          }}
        </ElButton>
        <ElPopconfirm
          v-if="showProcess(row)"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.andon.process')"
          :title="$t('mes.andon.confirmProcess', { code: row.eventCode })"
          placement="left"
          width="240"
          @confirm="onProcess(row)"
        >
          <template #reference>
            <ElButton link size="small" type="primary">
              {{ $t('mes.andon.process') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-if="showResolve(row)"
          link
          size="small"
          type="primary"
          @click="openAction('resolve', row)"
        >
          {{ $t('mes.andon.resolve') }}
        </ElButton>
        <ElButton
          v-if="showClose(row)"
          link
          size="small"
          type="primary"
          @click="openAction('close', row)"
        >
          {{ $t('mes.andon.close') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
