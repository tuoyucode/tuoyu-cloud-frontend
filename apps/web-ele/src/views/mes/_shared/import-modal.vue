<script lang="ts" setup>
import type { MesImportApi } from '@tuoyu/shared/api/mes/import';
import type { UploadFile, UploadInstance, UploadRawFile } from 'element-plus';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  downloadMesImportTemplate,
  importMesData,
  splitImportMessage,
} from '@tuoyu/shared/api/mes/import';
import {
  ElAlert,
  ElButton,
  ElMessage,
  ElUpload,
  genFileId,
} from 'element-plus';

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

const uploadRef = ref<UploadInstance>();
const fileList = ref<UploadFile[]>([]);
const result = ref<MesImportApi.Result>();
const downloading = ref(false);

const file = computed(() => fileList.value[0]?.raw);
const detail = computed(() =>
  result.value ? splitImportMessage(result.value.message) : undefined,
);

/** 只选择文件，不自动上传；不支持的文件类型不加入列表 */
function onChange(selected: UploadFile, files: UploadFile[]) {
  const name = selected.name.toLowerCase();
  if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
    ElMessage.error($t('mes.import.fileType'));
    fileList.value = files.filter((item) => item.uid !== selected.uid);
    return;
  }
  fileList.value = [selected];
  result.value = undefined;
}

/** 已选过文件时，新选的文件替换旧文件 */
function onExceed(files: File[]) {
  const [next] = files;
  if (!next) {
    return;
  }
  uploadRef.value?.clearFiles();
  const raw = next as UploadRawFile;
  raw.uid = genFileId();
  uploadRef.value?.handleStart(raw);
}

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
      ElMessage.warning($t('mes.import.fileRequired'));
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
      <ElUpload
        ref="uploadRef"
        v-model:file-list="fileList"
        :accept="ACCEPT"
        :auto-upload="false"
        :limit="1"
        :on-change="onChange"
        :on-exceed="onExceed"
        :on-remove="onRemove"
        drag
      >
        <p class="py-2">{{ $t('mes.import.drag') }}</p>
        <p class="text-muted-foreground text-xs">
          {{ $t('mes.import.hint') }}
        </p>
      </ElUpload>

      <div class="flex justify-end">
        <ElButton
          :loading="downloading"
          link
          size="small"
          type="primary"
          @click="onDownloadTemplate"
        >
          {{ $t('mes.import.downloadTemplate') }}
        </ElButton>
      </div>

      <ElAlert
        v-if="result && detail"
        :closable="false"
        :title="
          result.success
            ? $t('mes.import.succeeded')
            : detail.summary || $t('mes.import.failed')
        "
        :type="result.success ? 'success' : 'error'"
        show-icon
      >
        <p v-if="result.success" class="text-xs">{{ detail.summary }}</p>
        <ul
          v-else-if="detail.lines.length > 0"
          class="max-h-60 list-none overflow-auto p-0 text-xs"
        >
          <li v-for="(line, index) in detail.lines" :key="index">
            {{ line }}
          </li>
        </ul>
      </ElAlert>
    </div>
  </Modal>
</template>
