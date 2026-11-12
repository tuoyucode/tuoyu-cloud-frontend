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
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElTag,
} from 'element-plus';

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

async function onUse(row: OssApi.Config) {
  try {
    await ElMessageBox.confirm(
      $t('system.oss.config.confirmUse', { name: row.configKey }),
      $t('system.oss.config.use'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('system.oss.config.useConfirmOk'),
        type: 'warning',
      },
    );
  } catch {
    // 取消
    return;
  }
  switching.value = row.ossConfigId;
  try {
    await enableOssConfig(row);
    ElMessage.success($t('system.oss.config.used', { name: row.configKey }));
    reload();
  } finally {
    switching.value = undefined;
  }
}

async function onDelete(row: OssApi.Config) {
  await removeOssConfig([row.ossConfigId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as OssApi.Config[];
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
  await removeOssConfig(rows.map((row) => row.ossConfigId));
  ElMessage.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.oss.config.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('system:ossConfig:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.oss.config.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:ossConfig:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
      </template>

      <template #toolbar-tools>
        <ElButton class="mr-2" @click="onBack">
          {{ $t('system.oss.config.back') }}
        </ElButton>
      </template>

      <template #status="{ row }">
        <ElTag v-if="row.status === YES" disable-transitions type="success">
          {{ $t('system.oss.config.inUse') }}
        </ElTag>
        <ElButton
          v-else-if="hasPermission('system:ossConfig:edit')"
          :loading="switching === row.ossConfigId"
          link
          size="small"
          type="primary"
          @click="onUse(row)"
        >
          {{ $t('system.oss.config.use') }}
        </ElButton>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('system:ossConfig:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('system:ossConfig:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('system.oss.config.delete')"
          :title="$t('crud.confirmDelete', { name: row.configKey })"
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
