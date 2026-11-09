<script lang="ts" setup>
import type { ConfigApi } from '@tuoyu/shared/api/system/config';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportConfig,
  listConfig,
  refreshConfigCache,
  removeConfig,
} from '@tuoyu/shared/api/system/config';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm, Tooltip } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import ConfigDrawer from './config-drawer.vue';
import { BUILT_IN, useColumns, useSearchSchema } from './data';

defineOptions({ name: 'SystemConfig' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ConfigDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在刷新缓存，避免重复点击 */
const refreshing = ref(false);

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
          return await listConfig({
            ...toPageQuery(page),
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'configId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<ConfigApi.Config>,
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

function onEdit(row: ConfigApi.Config) {
  drawerApi.setData({ configId: row.configId }).open();
}

async function onDelete(row: ConfigApi.Config) {
  await removeConfig([row.configId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as ConfigApi.Config[];
  if (rows.length === 0) {
    return;
  }
  // 内置参数后端不允许删除，提前说明，避免整批失败
  const builtIn = rows.filter((row) => row.configType === BUILT_IN);
  if (builtIn.length > 0) {
    message.warning(
      $t('system.config.builtInSelected', {
        names: builtIn
          .map((row) => row.configName)
          .join($t('system.config.nameSeparator')),
      }),
    );
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeConfig(rows.map((row) => row.configId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('system.config.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportConfig(query, fileName);
}

async function onRefreshCache() {
  refreshing.value = true;
  try {
    await refreshConfigCache();
    message.success($t('system.config.cacheRefreshed'));
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.config.list')">
      <template #toolbar-actions>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="hasPermission('system:config:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.config.create') }}
          </Button>
          <Button
            v-if="hasPermission('system:config:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('system:config:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
          <Tooltip
            v-if="hasPermission('system:config:remove')"
            :title="$t('system.config.refreshCacheHelp')"
          >
            <Button :loading="refreshing" @click="onRefreshCache">
              {{ $t('system.config.refreshCache') }}
            </Button>
          </Tooltip>
        </div>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('system:config:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <template v-if="hasPermission('system:config:remove')">
          <Tooltip
            v-if="row.configType === BUILT_IN"
            :title="$t('system.config.builtInCannotDelete')"
          >
            <Button danger disabled size="small" type="link">
              {{ $t('common.delete') }}
            </Button>
          </Tooltip>
          <Popconfirm
            v-else
            :ok-button-props="{ danger: true }"
            :ok-text="$t('system.config.delete')"
            :title="$t('crud.confirmDelete', { name: row.configName })"
            placement="left"
            @confirm="onDelete(row)"
          >
            <Button danger size="small" type="link">
              {{ $t('common.delete') }}
            </Button>
          </Popconfirm>
        </template>
      </template>
    </Grid>
  </Page>
</template>
