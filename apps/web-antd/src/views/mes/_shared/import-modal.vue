<script lang="ts" setup>
import type { MesImportApi } from '@tuoyu/shared/api/mes/import';
import type { UploadProps } from 'ant-design-vue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  downloadMesImportTemplate,
  importMesData,
  splitImportMessage,
} from '@tuoyu/shared/api/mes/import';
import { Alert, Button, message, Upload } from 'ant-design-vue';

import { $t } from '#/locales';

/**
 * 主数据的导入弹窗：下载模板、选择文件、导入，失败时逐行列出原因（第几行、哪个字段、原因）。
 * 后端先整体校验，有任何一行不合格时一行都不写入
 */
const props = defineProps<{
  /** 接口资源名，例如 material 对应 /mes/material/importData */
  resource: string;
  /** 业务名称，用于标题与模板文件名，例如“物料” */
  title: string;
}>();

const emit = defineEmits<{ success: [] }>();

/** 支持的文件类型 */
const ACCEPT = '.xls,.xlsx';

const fileList = ref<NonNullable<UploadProps['fileList']>>([]);
const result = ref<MesImportApi.Result>();
const downloading = ref(false);

const file = computed(() => fileList.value[0]?.originFileObj);
const detail = computed(() =>
  result.value ? splitImportMessage(result.value.message) : undefined,
);

/** 只选择文件，不自动上传；新选的文件替换旧文件 */
const beforeUpload: UploadProps['beforeUpload'] = (selected) => {
  const name = selected.name.toLowerCase();
  if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
    message.error($t('mes.import.fileType'));
    return Upload.LIST_IGNORE;
  }
  fileList.value = [
    {
      name: selected.name,
      originFileObj: selected,
      status: 'done',
      uid: selected.uid,
    },
  ];
  result.value = undefined;
  return false;
};

function onRemove() {
  fileList.value = [];
  result.value = undefined;
}

async function onDownloadTemplate() {
  downloading.value = true;
  try {
    await downloadMesImportTemplate(
      props.resource,
      `${$t('mes.import.templateFileName', { name: props.title })}.xlsx`,
    );
  } finally {
    downloading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!file.value) {
      message.warning($t('mes.import.fileRequired'));
      return;
    }
    modalApi.lock();
    try {
      // 行数上限、逐行校验都由后端完成，失败原因在返回的 message 中
      result.value = await importMesData(props.resource, file.value);
      if (result.value.success) {
        // 清空已导入的文件，避免重复导入
        fileList.value = [];
        emit('success');
      }
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      fileList.value = [];
      result.value = undefined;
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.import.start')"
    :title="$t('mes.import.title', { name: title })"
    class="w-full max-w-[640px]"
  >
    <div class="flex flex-col gap-4">
      <Upload.Dragger
        :accept="ACCEPT"
        :before-upload="beforeUpload"
        :file-list="fileList"
        :max-count="1"
        @remove="onRemove"
      >
        <p class="py-2">{{ $t('mes.import.drag') }}</p>
        <p class="text-muted-foreground text-xs">
          {{ $t('mes.import.hint') }}
        </p>
      </Upload.Dragger>

      <div class="flex justify-end">
        <Button
          :loading="downloading"
          size="small"
          type="link"
          @click="onDownloadTemplate"
        >
          {{ $t('mes.import.downloadTemplate') }}
        </Button>
      </div>

      <Alert
        v-if="result && detail"
        :message="
          result.success
            ? $t('mes.import.succeeded')
            : detail.summary || $t('mes.import.failed')
        "
        :type="result.success ? 'success' : 'error'"
        show-icon
      >
        <template #description>
          <p v-if="result.success" class="text-xs">{{ detail.summary }}</p>
          <ul
            v-else-if="detail.lines.length > 0"
            class="max-h-60 list-none overflow-auto p-0 text-xs"
          >
            <li v-for="(line, index) in detail.lines" :key="index">
              {{ line }}
            </li>
          </ul>
        </template>
      </Alert>
    </div>
  </Modal>
</template>
