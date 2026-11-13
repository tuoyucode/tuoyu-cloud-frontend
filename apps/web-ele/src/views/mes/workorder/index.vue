<script lang="ts" setup>
import type { WorkorderApi } from '@tuoyu/shared/api/mes/workorder';

import type { WorkorderAction } from './use-workorder-actions';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import { getBatchLabels } from '@tuoyu/shared/api/mes/labelTemplate';
import {
  exportWorkorder,
  listWorkorder,
  removeWorkorder,
} from '@tuoyu/shared/api/mes/workorder';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElProgress,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import LabelPrintModal from '#/views/mes/_shared/label-print-modal.vue';

import { toQuery, useColumns, useSearchSchema } from './data';
import ReasonModal from './reason-modal.vue';
import {
  ACTION_LABEL_KEYS,
  availableActions,
  DANGER_ACTIONS,
  isDraft,
  useWorkorderActions,
} from './use-workorder-actions';
import WorkorderDetailDrawer from './workorder-detail-drawer.vue';
import WorkorderDrawer from './workorder-drawer.vue';

defineOptions({ name: 'MesWorkorder' });

/** “更多”菜单中打印批次标签的命令；其余命令是状态动作 */
const PRINT_BATCH = 'printBatchLabel';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: WorkorderDrawer,
  destroyOnClose: true,
});

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: WorkorderDetailDrawer,
  destroyOnClose: true,
});

const [ReasonDialog, reasonApi] = useVbenModal({
  connectedComponent: ReasonModal,
});

const [PrintModal, printModalApi] = useVbenModal({
  connectedComponent: LabelPrintModal,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    schema: useSearchSchema(),
    showCollapseButton: true,
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: {
      checkMethod: ({ row }) => isDraft(row as WorkorderApi.Workorder),
      highlight: true,
    },
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) => {
          selectedCount.value = 0;
          return await listWorkorder({
            ...toPageQuery(page, sorts),
            ...toQuery(formValues),
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'workorderId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<WorkorderApi.Workorder>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

const { run } = useWorkorderActions(
  (data) => reasonApi.setData(data).open(),
  reload,
);

function onCreate() {
  formDrawerApi.setData({}).open();
}

function onEdit(row: WorkorderApi.Workorder) {
  formDrawerApi.setData({ workorderId: row.workorderId }).open();
}

function onDetail(row: WorkorderApi.Workorder) {
  detailDrawerApi.setData({ workorderId: row.workorderId }).open();
}

async function onDelete(row: WorkorderApi.Workorder) {
  await removeWorkorder([row.workorderId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as WorkorderApi.Workorder[];
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('crud.confirmBatchDelete', { count: rows.length }),
      $t('crud.batchDelete'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonClass: 'el-button--danger',
        confirmButtonText: $t('crud.batchDelete'),
        type: 'warning',
      },
    );
  } catch {
    // 取消
    return;
  }
  await removeWorkorder(rows.map((row) => row.workorderId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onExport() {
  const values = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.workorder.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportWorkorder(toQuery(values), fileName);
}

/** 有批次号的工单可以打印批次标签 */
function canPrintBatch(row: WorkorderApi.Workorder) {
  return Boolean(row.batchCode) && hasPermission('mes:workorder:print');
}

/** 打印工单的批次标签（可以打多份） */
function onPrintBatch(row: WorkorderApi.Workorder) {
  printModalApi
    .setData({
      allowCopies: true,
      loader: () => getBatchLabels([row.workorderId]),
      target: 'batch',
    })
    .open();
}

/** 行内直接显示第一个状态动作，其余放进“更多” */
function primaryActions(row: WorkorderApi.Workorder) {
  return availableActions(row.workorderStatus).slice(0, 1);
}

function moreActions(row: WorkorderApi.Workorder) {
  return availableActions(row.workorderStatus).slice(1);
}

function onMore(row: WorkorderApi.Workorder, command: string) {
  if (command === PRINT_BATCH) {
    onPrintBatch(row);
    return;
  }
  run(command as WorkorderAction, row);
}

/** 完成率进度条的百分比（0 ~ 100） */
function progressPercent(row: WorkorderApi.Workorder) {
  return Math.min(100, Math.max(0, Number(row.completionRate ?? 0)));
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="reload" />
    <DetailDrawer @changed="reload" />
    <ReasonDialog />
    <PrintModal />
    <Grid :table-title="$t('mes.workorder.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:workorder:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.workorder.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:workorder:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:workorder:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #workorderCode="{ row }">
        <ElButton
          v-if="hasPermission('mes:workorder:query')"
          link
          type="primary"
          @click="onDetail(row)"
        >
          {{ row.workorderCode }}
        </ElButton>
        <span v-else>{{ row.workorderCode }}</span>
      </template>

      <template #status="{ row }">
        <EnumTag :value="row.workorderStatus" type="WorkorderStatus" />
      </template>

      <template #progress="{ row }">
        <ElProgress :percentage="progressPercent(row)" :stroke-width="6" />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="isDraft(row) && hasPermission('mes:workorder:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="isDraft(row) && hasPermission('mes:workorder:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.workorder.delete')"
          :title="$t('crud.confirmDelete', { name: row.workorderCode })"
          confirm-button-type="danger"
          placement="left"
          width="240"
          @confirm="onDelete(row)"
        >
          <template #reference>
            <ElButton link size="small" type="danger">
              {{ $t('common.delete') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-for="action in primaryActions(row)"
          :key="action"
          :type="DANGER_ACTIONS.has(action) ? 'danger' : 'primary'"
          link
          size="small"
          @click="run(action, row)"
        >
          {{ $t(ACTION_LABEL_KEYS[action]) }}
        </ElButton>
        <ElDropdown
          v-if="moreActions(row).length > 0 || canPrintBatch(row)"
          class="ml-3 align-middle"
          placement="bottom-end"
          trigger="click"
          @command="(command: string) => onMore(row, command)"
        >
          <ElButton link size="small" type="primary">
            {{ $t('mes.workorder.more') }}
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem
                v-for="action in moreActions(row)"
                :key="action"
                :class="{ '!text-destructive': DANGER_ACTIONS.has(action) }"
                :command="action"
              >
                {{ $t(ACTION_LABEL_KEYS[action]) }}
              </ElDropdownItem>
              <ElDropdownItem v-if="canPrintBatch(row)" :command="PRINT_BATCH">
                {{ $t('mes.workorder.printBatchLabel') }}
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </template>
    </Grid>
  </Page>
</template>
