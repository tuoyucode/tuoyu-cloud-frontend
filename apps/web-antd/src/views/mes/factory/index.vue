<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { FactoryApi } from '#/api/mes/factory';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import { Button, message, Modal, Popconfirm, Switch } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  exportFactory,
  listFactory,
  removeFactory,
  updateFactory,
} from '#/api/mes/factory';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

import { useColumns, useSearchSchema } from './data';
import FactoryDrawer from './factory-drawer.vue';

defineOptions({ name: 'MesFactory' });

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: FactoryDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSearchSchema(),
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
          return await listFactory({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'factoryId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<FactoryApi.Factory>,
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

function onEdit(row: FactoryApi.Factory) {
  drawerApi.setData({ factoryId: row.factoryId }).open();
}

async function onDelete(row: FactoryApi.Factory) {
  await removeFactory([row.factoryId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as FactoryApi.Factory[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeFactory(rows.map((row) => row.factoryId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onStatusChange(row: FactoryApi.Factory, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.factoryId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateFactory({ ...row, status });
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.factoryName,
      }),
    );
  } finally {
    switching.value.delete(row.factoryId);
  }
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.factory.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportFactory(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.factory.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:factory:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.factory.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:factory:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button v-if="hasPermission('mes:factory:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="!hasPermission('mes:factory:edit')"
          :loading="switching.has(row.factoryId)"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:factory:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:factory:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.factory.delete')"
          :title="$t('crud.confirmDelete', { name: row.factoryName })"
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
