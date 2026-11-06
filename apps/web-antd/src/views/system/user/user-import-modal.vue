<script lang="ts" setup>
import type { UploadProps } from 'ant-design-vue';

import type { UserApi } from '#/api/system/user';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Alert, Button, Checkbox, message, Upload } from 'ant-design-vue';

import { downloadUserImportTemplate, importUser } from '#/api/system/user';
import { $t } from '#/locales';

const emit = defineEmits<{ success: [] }>();

/** 支持的文件类型 */
const ACCEPT = '.xls,.xlsx';

const fileList = ref<NonNullable<UploadProps['fileList']>>([]);
const updateSupport = ref(false);
const result = ref<UserApi.ImportResult>();
const downloading = ref(false);

const file = computed(() => fileList.value[0]?.originFileObj);

/** 只选择文件，不自动上传；新选的文件替换旧文件 */
const beforeUpload: UploadProps['beforeUpload'] = (selected) => {
  const name = selected.name.toLowerCase();
  if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
    message.error($t('system.user.importFileType'));
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
      message.warning($t('system.user.importFileRequired'));
      return;
    }
    modalApi.lock();
    try {
      // 行数上限等由后端校验，失败原因在返回的 msg 中
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
      <Upload.Dragger
        :accept="ACCEPT"
        :before-upload="beforeUpload"
        :file-list="fileList"
        :max-count="1"
        @remove="onRemove"
      >
        <p class="py-2">{{ $t('system.user.importDrag') }}</p>
        <p class="text-muted-foreground text-xs">
          {{ $t('system.user.importHint') }}
        </p>
      </Upload.Dragger>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <Checkbox v-model:checked="updateSupport">
          {{ $t('system.user.updateSupport') }}
        </Checkbox>
        <Button
          :loading="downloading"
          size="small"
          type="link"
          @click="onDownloadTemplate"
        >
          {{ $t('system.user.downloadTemplate') }}
        </Button>
      </div>

      <Alert
        v-if="result"
        :message="
          result.success
            ? $t('system.user.importSucceeded')
            : $t('system.user.importFailed')
        "
        :type="result.success ? 'success' : 'error'"
        show-icon
      >
        <template #description>
          <div class="max-h-60 overflow-auto whitespace-pre-wrap text-xs">
            {{ result.message }}
          </div>
        </template>
      </Alert>
    </div>
  </Modal>
</template>
