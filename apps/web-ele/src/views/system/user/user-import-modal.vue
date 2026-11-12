<script lang="ts" setup>
import type { UserApi } from '@tuoyu/shared/api/system/user';
import type { UploadFile, UploadInstance, UploadRawFile } from 'element-plus';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  downloadUserImportTemplate,
  importUser,
} from '@tuoyu/shared/api/system/user';
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElMessage,
  ElUpload,
  genFileId,
} from 'element-plus';

import { $t } from '#/locales';

const emit = defineEmits<{ success: [] }>();

/** 支持的文件类型 */
const ACCEPT = '.xls,.xlsx';

const uploadRef = ref<UploadInstance>();
const fileList = ref<UploadFile[]>([]);
const updateSupport = ref(false);
const result = ref<UserApi.ImportResult>();
const downloading = ref(false);

const file = computed(() => fileList.value[0]?.raw);

/** 只选择文件，不自动上传；不支持的文件类型不加入列表 */
function onChange(selected: UploadFile, files: UploadFile[]) {
  const name = selected.name.toLowerCase();
  if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
    ElMessage.error($t('system.user.importFileType'));
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
    await downloadUserImportTemplate(
      `${$t('system.user.templateFileName')}.xlsx`,
    );
  } finally {
    downloading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!file.value) {
      ElMessage.warning($t('system.user.importFileRequired'));
      return;
    }
    modalApi.lock();
    try {
      // 行数上限等由后端校验，失败原因在返回的 message 中
      result.value = await importUser(file.value, updateSupport.value);
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
      updateSupport.value = false;
      result.value = undefined;
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('system.user.startImport')"
    :title="$t('system.user.importTitle')"
    class="w-full max-w-[560px]"
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
        <p class="py-2">{{ $t('system.user.importDrag') }}</p>
        <p class="text-muted-foreground text-xs">
          {{ $t('system.user.importHint') }}
        </p>
      </ElUpload>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <ElCheckbox v-model="updateSupport">
          {{ $t('system.user.updateSupport') }}
        </ElCheckbox>
        <ElButton
          :loading="downloading"
          link
          size="small"
          type="primary"
          @click="onDownloadTemplate"
        >
          {{ $t('system.user.downloadTemplate') }}
        </ElButton>
      </div>

      <ElAlert
        v-if="result"
        :closable="false"
        :title="
          result.success
            ? $t('system.user.importSucceeded')
            : $t('system.user.importFailed')
        "
        :type="result.success ? 'success' : 'error'"
        show-icon
      >
        <div class="max-h-60 overflow-auto whitespace-pre-wrap text-xs">
          {{ result.message }}
        </div>
      </ElAlert>
    </div>
  </Modal>
</template>
