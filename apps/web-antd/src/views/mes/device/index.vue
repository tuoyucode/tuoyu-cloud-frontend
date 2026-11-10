<script lang="ts" setup>
import type { DeviceApi } from '@tuoyu/shared/api/mes/device';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportDevice,
  listDevice,
  removeDevice,
  updateDevice,
} from '@tuoyu/shared/api/mes/device';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm, Switch } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import MesImportModal from '../_shared/import-modal.vue';
import { useColumns, useSearchSchema } from './data';
import DeviceDrawer from './device-drawer.vue';

defineOptions({ name: 'MesDevice' });

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: DeviceDrawer,
  destroyOnClose: true,
});

const [ImportModal, importModalApi] = useVbenModal({
  connectedComponent: MesImportModal,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

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
          return await listDevice({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'deviceId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DeviceApi.Device>,
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

function onEdit(row: DeviceApi.Device) {
  drawerApi.setData({ deviceId: row.deviceId }).open();
}

async function onDelete(row: DeviceApi.Device) {
  await removeDevice([row.deviceId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as DeviceApi.Device[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeDevice(rows.map((row) => row.deviceId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onStatusChange(row: DeviceApi.Device, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.deviceId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateDevice({ ...row, status });
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.deviceName,
      }),
    );
  } finally {
    switching.value.delete(row.deviceId);
  }
}

function onImport() {
  importModalApi.open();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.device.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportDevice(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <ImportModal
      :title="$t('mes.device.title')"
      resource="device"
      @success="reload"
    />
    <Grid :table-title="$t('mes.device.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:device:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.device.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:device:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button v-if="hasPermission('mes:device:import')" @click="onImport">
            {{ $t('mes.import.button') }}
          </Button>
          <Button v-if="hasPermission('mes:device:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="!hasPermission('mes:device:edit')"
          :loading="switching.has(row.deviceId)"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:device:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:device:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.device.delete')"
          :title="$t('crud.confirmDelete', { name: row.deviceName })"
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
