<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { uploadOss } from '@tuoyu/shared/api/system/oss';
import { errorMessageOf } from '@tuoyu/shared/utils/api-result';
import { UploadDragger } from 'ant-design-vue';

import { $t } from '#/locales';

import { UPLOAD_ACCEPT } from './data';

const emit = defineEmits<{ success: [] }>();

/** 本次打开后上传的文件（含进度与结果） */
const fileList = ref<UploadFile[]>([]);

/** 本次是否有文件上传成功，关闭时据此刷新列表 */
let uploadedAny = false;

const [Modal, modalApi] = useVbenModal({
  onConfirm() {
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      fileList.value = [];
      uploadedAny = false;
      return;
    }
    if (uploadedAny) {
      emit('success');
    }
  },
});

/** 从请求错误中取出原因：优先使用后端的 message（例如超过上传上限时的 413 提示） */
function errorReason(error: unknown): string {
  return errorMessageOf(error, $t('system.oss.uploadFailedUnknown'));
}

async function customRequest(options: UploadRequestOption) {
  const file = options.file as File;
  try {
    const result = await uploadOss(file, (percent) =>
      options.onProgress?.({ percent }),
    );
    uploadedAny = true;
    options.onSuccess?.(result);
  } catch (error) {
    // 失败原因已由请求层提示，这里记在列表中，鼠标悬停可查看
    const reason = errorReason(error);
    options.onError?.(new Error(reason), reason);
  }
}
</script>

<template>
  <Modal
    :confirm-text="$t('system.oss.uploadDone')"
    :show-cancel-button="false"
    :title="$t('system.oss.uploadTitle')"
    class="w-full max-w-[600px]"
  >
    <UploadDragger
      v-model:file-list="fileList"
      :accept="UPLOAD_ACCEPT"
      :custom-request="customRequest"
      multiple
      name="file"
    >
      <p class="ant-upload-drag-icon flex justify-center">
        <IconifyIcon class="size-10 text-primary" icon="lucide:upload" />
      </p>
      <p class="ant-upload-text">{{ $t('system.oss.uploadHint') }}</p>
      <p class="ant-upload-hint">{{ $t('system.oss.uploadTypeHint') }}</p>
      <p class="ant-upload-hint">{{ $t('system.oss.uploadLimitHint') }}</p>
    </UploadDragger>
  </Modal>
</template>
