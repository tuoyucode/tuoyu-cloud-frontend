<script lang="ts" setup>
import type { WorkorderApi } from '@tuoyu/shared/api/mes/workorder';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportWorkorder,
  listWorkorder,
  removeWorkorder,
} from '@tuoyu/shared/api/mes/workorder';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  Button,
  Dropdown,
  Menu,
  MenuItem,
  message,
  Modal,
  Popconfirm,
  Progress,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

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
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as WorkorderApi.Workorder[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeWorkorder(rows.map((row) => row.workorderId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onExport() {
  const values = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.workorder.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportWorkorder(toQuery(values), fileName);
}

/** 行内直接显示第一个状态动作，其余放进“更多” */
function primaryActions(row: WorkorderApi.Workorder) {
  return availableActions(row.workorderStatus).slice(0, 1);
}

function moreActions(row: WorkorderApi.Workorder) {
  return availableActions(row.workorderStatus).slice(1);
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="reload" />
    <DetailDrawer @changed="reload" />
    <ReasonDialog />
    <Grid :table-title="$t('mes.workorder.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:workorder:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.workorder.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:workorder:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('mes:workorder:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #workorderCode="{ row }">
        <Button
          v-if="hasPermission('mes:workorder:query')"
          class="p-0"
          type="link"
          @click="onDetail(row)"
        >
          {{ row.workorderCode }}
        </Button>
        <span v-else>{{ row.workorderCode }}</span>
      </template>

      <template #status="{ row }">
        <EnumTag :value="row.workorderStatus" type="WorkorderStatus" />
      </template>

      <template #progress="{ row }">
        <Progress
          :percent="Number(row.completionRate ?? 0)"
          class="m-0"
          size="small"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="isDraft(row) && hasPermission('mes:workorder:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="isDraft(row) && hasPermission('mes:workorder:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.workorder.delete')"
          :title="$t('crud.confirmDelete', { name: row.workorderCode })"
          placement="left"
          @confirm="onDelete(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('common.delete') }}
          </Button>
        </Popconfirm>
        <Button
          v-for="action in primaryActions(row)"
          :key="action"
          :danger="DANGER_ACTIONS.has(action)"
          size="small"
          type="link"
          @click="run(action, row)"
        >
          {{ $t(ACTION_LABEL_KEYS[action]) }}
        </Button>
        <Dropdown v-if="moreActions(row).length > 0" placement="bottomRight">
          <Button size="small" type="link">
            {{ $t('mes.workorder.more') }}
          </Button>
          <template #overlay>
            <Menu>
              <MenuItem
                v-for="action in moreActions(row)"
                :key="action"
                :danger="DANGER_ACTIONS.has(action)"
                @click="run(action, row)"
              >
                {{ $t(ACTION_LABEL_KEYS[action]) }}
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
      </template>
    </Grid>
  </Page>
</template>
