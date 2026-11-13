<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportCheckRecord,
  getCheckRecordLogs,
  listCheckRecord,
  voidCheckRecord,
} from '@tuoyu/shared/api/mes/equipment';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';
import ReasonModal from '../common/reason-modal.vue';
import StatusLogModal from '../common/status-log-modal.vue';
import AndonModal from './andon-modal.vue';
import CheckRecordDetailDrawer from './check-record-detail-drawer.vue';
import CheckRecordDrawer from './check-record-drawer.vue';
import {
  canRaiseAndon,
  canVoid,
  toQuery,
  useColumns,
  useSearchSchema,
} from './data';

defineOptions({ name: 'MesCheckRecord' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: CheckRecordDrawer,
  destroyOnClose: true,
});

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: CheckRecordDetailDrawer,
  destroyOnClose: true,
});

const [AndonDialog, andonApi] = useVbenModal({
  connectedComponent: AndonModal,
});

const [ReasonDialog, reasonApi] = useVbenModal({
  connectedComponent: ReasonModal,
});

const [LogDialog, logApi] = useVbenModal({
  connectedComponent: StatusLogModal,
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
          await listCheckRecord({
            ...toPageQuery(page, sorts),
            ...toQuery(formValues),
          }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'checkRecordId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<EquipmentApi.CheckRecord>,
});

function reload() {
  gridApi.query();
}

function onCreate() {
  formDrawerApi.open();
}

function onDetail(row: EquipmentApi.CheckRecord) {
  detailDrawerApi.setData({ checkRecordId: row.checkRecordId }).open();
}

function onAndon(row: EquipmentApi.CheckRecord) {
  andonApi.setData({ record: row }).open();
}

function onVoid(row: EquipmentApi.CheckRecord) {
  reasonApi
    .setData({
      okText: $t('mes.equipment.checkRecord.voidConfirm'),
      async submit(reason: string) {
        await voidCheckRecord(row.checkRecordId, reason);
        ElMessage.success($t('mes.equipment.checkRecord.voided'));
      },
      title: `${$t('mes.equipment.checkRecord.voidTitle')} ${row.recordCode}`,
    })
    .open();
}

function onLogs(row: EquipmentApi.CheckRecord) {
  logApi
    .setData({
      load: () => getCheckRecordLogs(row.checkRecordId),
      statusType: 'CheckRecordStatus',
      title: $t('mes.equipment.common.logsTitle', { code: row.recordCode }),
    })
    .open();
}

async function onExport() {
  const values = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.equipment.checkRecord.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportCheckRecord(toQuery(values), fileName);
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="reload" />
    <DetailDrawer />
    <AndonDialog @success="reload" />
    <ReasonDialog @success="reload" />
    <LogDialog />
    <Grid :table-title="$t('mes.equipment.checkRecord.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:checkRecord:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.equipment.checkRecord.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:checkRecord:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #recordCode="{ row }">
        <ElButton
          v-if="hasPermission('mes:checkRecord:query')"
          link
          type="primary"
          @click="onDetail(row)"
        >
          {{ row.recordCode }}
        </ElButton>
        <span v-else>{{ row.recordCode }}</span>
      </template>

      <template #checkResult="{ row }">
        <EquipmentTag :value="row.checkResult" type="CheckResult" />
      </template>

      <template #recordStatus="{ row }">
        <EquipmentTag :value="row.recordStatus" type="CheckRecordStatus" />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="canRaiseAndon(row) && hasPermission('mes:checkRecord:andon')"
          link
          size="small"
          type="danger"
          @click="onAndon(row)"
        >
          {{ $t('mes.equipment.checkRecord.andon') }}
        </ElButton>
        <ElButton
          v-if="canVoid(row) && hasPermission('mes:checkRecord:void')"
          link
          size="small"
          type="primary"
          @click="onVoid(row)"
        >
          {{ $t('mes.equipment.checkRecord.void') }}
        </ElButton>
        <ElButton
          v-if="hasPermission('mes:checkRecord:query')"
          link
          size="small"
          type="primary"
          @click="onLogs(row)"
        >
          {{ $t('mes.equipment.common.logs') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
