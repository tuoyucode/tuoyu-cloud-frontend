<script lang="ts" setup>
import type { OssApi } from '@tuoyu/shared/api/system/oss';

import type { FileSearchValues } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  downloadOss,
  getOssPreviewEnabled,
  listOss,
  removeOss,
} from '@tuoyu/shared/api/system/oss';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElImage,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  CONFIG_PAGE_PATH,
  isImage,
  toFileQuery,
  useColumns,
  useSearchSchema,
} from './data';
import UploadModal from './upload-modal.vue';

defineOptions({ name: 'SystemOss' });

const router = useRouter();

const [UploadDialog, uploadApi] = useVbenModal({
  connectedComponent: UploadModal,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在下载的文件，避免重复点击 */
const downloading = ref(new Set<string>());

/** 是否在列表中预览图片（系统参数 sys.oss.previewListResource） */
const previewEnabled = ref(true);

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
        query: async ({ page }, formValues: FileSearchValues) => {
          selectedCount.value = 0;
          return await listOss({
            ...toPageQuery(page),
            ...toFileQuery(formValues),
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'ossId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<OssApi.File>,
});

onMounted(async () => {
  // 预览开关是系统参数，读取需要参数查询权限；没有权限时保持默认值，不发请求（否则会提示 403）
  if (hasPermission('system:config:query')) {
    previewEnabled.value = await getOssPreviewEnabled();
  }
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onUpload() {
  uploadApi.open();
}

function onOpenConfig() {
  router.push(CONFIG_PAGE_PATH);
}

async function onDownload(row: OssApi.File) {
  downloading.value.add(row.ossId);
  try {
    await downloadOss(row.ossId, row.originalName);
  } finally {
    downloading.value.delete(row.ossId);
  }
}

async function onDelete(row: OssApi.File) {
  await removeOss([row.ossId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as OssApi.File[];
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
  await removeOss(rows.map((row) => row.ossId));
  ElMessage.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <UploadDialog @success="reload" />
    <Grid :table-title="$t('system.oss.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('system:oss:upload')"
            type="primary"
            @click="onUpload"
          >
            {{ $t('system.oss.upload') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:oss:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:ossConfig:list')"
            @click="onOpenConfig"
          >
            {{ $t('system.oss.storageSettings') }}
          </ElButton>
        </div>
      </template>

      <template #preview="{ row }">
        <!-- 预览层挂到 body 上，避免被表格的单元格裁切 -->
        <ElImage
          v-if="previewEnabled && isImage(row) && row.url"
          :alt="row.originalName"
          :preview-src-list="[row.url]"
          :src="row.url"
          class="block size-9 rounded"
          fit="cover"
          preview-teleported
        />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('system:oss:download')"
          :loading="downloading.has(row.ossId)"
          link
          size="small"
          type="primary"
          @click="onDownload(row)"
        >
          {{ $t('system.oss.download') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('system:oss:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('system.oss.delete')"
          :title="$t('crud.confirmDelete', { name: row.originalName })"
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
