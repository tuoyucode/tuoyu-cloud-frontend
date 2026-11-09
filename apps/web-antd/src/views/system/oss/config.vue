<script lang="ts" setup>
import type { OssApi } from '@tuoyu/shared/api/system/oss';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  enableOssConfig,
  listOssConfig,
  removeOssConfig,
} from '@tuoyu/shared/api/system/oss';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import ConfigDrawer from './config-drawer.vue';
import {
  FILE_PAGE_PATH,
  useConfigColumns,
  useConfigSearchSchema,
  YES,
} from './data';

defineOptions({ name: 'SystemOssConfig' });

const router = useRouter();

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ConfigDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换的配置，避免重复点击 */
const switching = ref<string>();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useConfigSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useConfigColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listOssConfig({
            ...toPageQuery(page),
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'ossConfigId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<OssApi.Config>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onBack() {
  router.push(FILE_PAGE_PATH);
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: OssApi.Config) {
  drawerApi.setData({ ossConfigId: row.ossConfigId }).open();
}

function onUse(row: OssApi.Config) {
  Modal.confirm({
    content: $t('system.oss.config.confirmUse', { name: row.configKey }),
    okText: $t('system.oss.config.useConfirmOk'),
    async onOk() {
      switching.value = row.ossConfigId;
      try {
        await enableOssConfig(row);
        message.success($t('system.oss.config.used', { name: row.configKey }));
        reload();
      } finally {
        switching.value = undefined;
      }
    },
  });
}

async function onDelete(row: OssApi.Config) {
  await removeOssConfig([row.ossConfigId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as OssApi.Config[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeOssConfig(rows.map((row) => row.ossConfigId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.oss.config.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('system:ossConfig:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.oss.config.create') }}
          </Button>
          <Button
            v-if="hasPermission('system:ossConfig:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #toolbar-tools>
        <Button class="mr-2" @click="onBack">
          {{ $t('system.oss.config.back') }}
        </Button>
      </template>

      <template #status="{ row }">
        <Tag v-if="row.status === YES" :bordered="false" color="success">
          {{ $t('system.oss.config.inUse') }}
        </Tag>
        <Button
          v-else-if="hasPermission('system:ossConfig:edit')"
          :loading="switching === row.ossConfigId"
          size="small"
          type="link"
          @click="onUse(row)"
        >
          {{ $t('system.oss.config.use') }}
        </Button>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('system:ossConfig:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('system:ossConfig:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.oss.config.delete')"
          :title="$t('crud.confirmDelete', { name: row.configKey })"
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
