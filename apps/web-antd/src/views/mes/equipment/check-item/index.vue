<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  listCheckItem,
  removeCheckItem,
} from '@tuoyu/shared/api/mes/equipment';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';
import { limitsText } from '../common/utils';
import CheckItemDrawer from './check-item-drawer.vue';
import { useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MesCheckItem' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: CheckItemDrawer,
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
    checkboxConfig: { highlight: true },
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) => {
          selectedCount.value = 0;
          return await listCheckItem({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'checkItemId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<EquipmentApi.CheckItem>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: EquipmentApi.CheckItem) {
  drawerApi.setData({ checkItemId: row.checkItemId }).open();
}

async function onDelete(row: EquipmentApi.CheckItem) {
  await removeCheckItem([row.checkItemId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as EquipmentApi.CheckItem[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeCheckItem(rows.map((row) => row.checkItemId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.equipment.checkItem.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:checkItem:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.equipment.checkItem.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:checkItem:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #scope="{ row }">
        <span v-if="row.deviceId">
          {{ $t('mes.equipment.checkItem.scopeDevice') }}：{{
            [row.deviceCode, row.deviceName].filter(Boolean).join(' ')
          }}
        </span>
        <span v-else>
          {{ $t('mes.equipment.checkItem.scopeType') }}：{{ row.deviceType }}
        </span>
      </template>

      <template #resultType="{ row }">
        <EquipmentTag :value="row.resultType" type="CheckResultType" />
      </template>

      <template #limits="{ row }">
        {{ limitsText(row.lowerLimit, row.upperLimit, row.unit) }}
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:checkItem:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:checkItem:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.equipment.checkItem.delete')"
          :title="$t('crud.confirmDelete', { name: row.itemName })"
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
