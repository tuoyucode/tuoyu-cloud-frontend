<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  listCheckItem,
  removeCheckItem,
} from '@tuoyu/shared/api/mes/equipment';
import { limitsText } from '@tuoyu/shared/pages/mes/equipment-utils';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';
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
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as EquipmentApi.CheckItem[];
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
  await removeCheckItem(rows.map((row) => row.checkItemId));
  ElMessage.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.equipment.checkItem.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:checkItem:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.equipment.checkItem.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:checkItem:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
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
        <ElButton
          v-if="hasPermission('mes:checkItem:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('mes:checkItem:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.equipment.checkItem.delete')"
          :title="$t('crud.confirmDelete', { name: row.itemName })"
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
      </template>
    </Grid>
  </Page>
</template>
