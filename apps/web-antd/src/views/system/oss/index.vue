<script lang="ts" setup>
import type { FileSearchValues } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OssApi } from '#/api/system/oss';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, Image, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  downloadOss,
  getOssPreviewEnabled,
  listOss,
  removeOss,
} from '#/api/system/oss';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

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
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as OssApi.File[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeOss(rows.map((row) => row.ossId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <UploadDialog @success="reload" />
    <Grid :table-title="$t('system.oss.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('system:oss:upload')"
            type="primary"
            @click="onUpload"
          >
            {{ $t('system.oss.upload') }}
          </Button>
          <Button
            v-if="hasPermission('system:oss:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('system:ossConfig:list')"
            @click="onOpenConfig"
          >
            {{ $t('system.oss.storageSettings') }}
          </Button>
        </div>
      </template>

      <template #preview="{ row }">
        <Image
          v-if="previewEnabled && isImage(row) && row.url"
          :alt="row.originalName"
          :height="36"
          :src="row.url"
          :width="36"
          class="rounded object-cover"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('system:oss:download')"
          :loading="downloading.has(row.ossId)"
          size="small"
          type="link"
          @click="onDownload(row)"
        >
          {{ $t('system.oss.download') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('system:oss:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.oss.delete')"
          :title="$t('crud.confirmDelete', { name: row.originalName })"
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
