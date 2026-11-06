<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ClientApi } from '#/api/system/client';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import { Button, message, Modal, Popconfirm, Switch } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  exportClient,
  listClient,
  removeClient,
  updateClientStatus,
} from '#/api/system/client';
import { DictType } from '#/api/system/dict';
import DictTag from '#/components/dict-tag.vue';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

import ClientDrawer from './client-drawer.vue';
import { useColumns, useSearchSchema } from './data';

defineOptions({ name: 'SystemClient' });

/** 字典 sys_normal_disable：0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ClientDrawer,
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
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listClient({
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<ClientApi.Client>,
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

function onEdit(row: ClientApi.Client) {
  drawerApi.setData({ id: row.id }).open();
}

async function onDelete(row: ClientApi.Client) {
  await removeClient([row.id]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as ClientApi.Client[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('system.client.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeClient(rows.map((row) => row.id));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onStatusChange(row: ClientApi.Client, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.id);
  try {
    await updateClientStatus(row.clientId, status);
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.clientKey,
      }),
    );
  } finally {
    switching.value.delete(row.id);
  }
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('system.client.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportClient(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.client.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('system:client:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.client.create') }}
          </Button>
          <Button
            v-if="hasPermission('system:client:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('system:client:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #grantTypes="{ row }">
        <div class="flex flex-wrap gap-1">
          <DictTag
            v-for="grantType in row.grantTypeList ?? []"
            :key="grantType"
            :dict-type="DictType.GRANT_TYPE"
            :value="grantType"
          />
        </div>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="!hasPermission('system:client:edit')"
          :loading="switching.has(row.id)"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('system:client:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('system:client:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.client.delete')"
          :title="$t('system.client.confirmDelete', { name: row.clientKey })"
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
