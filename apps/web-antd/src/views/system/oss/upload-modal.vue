<script lang="ts" setup>
import type { OssApi } from '@tuoyu/shared/api/system/oss';
import type { UploadFile, UploadProps } from 'ant-design-vue';
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { getUploadConfig, uploadOss } from '@tuoyu/shared/api/system/oss';
import { errorMessageOf } from '@tuoyu/shared/utils/api-result';
import { message, Upload, UploadDragger } from 'ant-design-vue';

import { $t } from '#/locales';

import { formatFileSize, uploadAccept, uploadRejection } from './data';

const emit = defineEmits<{ success: [] }>();

/** 本次打开后上传的文件（含进度与结果） */
const fileList = ref<UploadFile[]>([]);

/** 服务端的上传限制；没有读到时不在前端筛选，由服务端校验 */
const config = ref<OssApi.UploadConfig>();

/** 本次是否有文件上传成功，关闭时据此刷新列表 */
let uploadedAny = false;

const accept = computed(() =>
  config.value ? uploadAccept(config.value.allowedExtensions) : undefined,
);

const typeHint = computed(() =>
  config.value
    ? $t('system.oss.uploadTypeHint', {
        types: config.value.allowedExtensions.join('、'),
      })
    : '',
);

const limitHint = computed(() =>
  config.value && config.value.maxFileSize >= 0
    ? $t('system.oss.uploadLimitHint', {
        size: formatFileSize(config.value.maxFileSize),
      })
    : '',
);

async function loadConfig() {
  try {
    config.value = await getUploadConfig();
  } catch {
    // 失败原因已由请求层提示；这时不在前端筛选，上传时由服务端校验并说明原因
    config.value = undefined;
  }
}

const [Modal, modalApi] = useVbenModal({
  onConfirm() {
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      fileList.value = [];
      uploadedAny = false;
      loadConfig();
      return;
    }
    if (uploadedAny) {
      emit('success');
    }
  },
});

/** 上传前按服务端的限制检查，不符合时提示原因且不加入列表 */
const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const current = config.value;
  if (!current) {
    return true;
  }
  const reason = uploadRejection(file, current);
  if (!reason) {
    return true;
  }
  message.warning(
    $t(reason, {
      name: file.name,
      size: formatFileSize(current.maxFileSize),
      types: current.allowedExtensions.join('、'),
    }),
  );
  return Upload.LIST_IGNORE;
};

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
      :accept="accept"
      :before-upload="beforeUpload"
      :custom-request="customRequest"
      multiple
      name="file"
    >
      <p class="ant-upload-drag-icon flex justify-center">
        <IconifyIcon class="size-10 text-primary" icon="lucide:upload" />
      </p>
      <p class="ant-upload-text">{{ $t('system.oss.uploadHint') }}</p>
      <p v-if="typeHint" class="ant-upload-hint">{{ typeHint }}</p>
      <p v-if="limitHint" class="ant-upload-hint">{{ limitHint }}</p>
    </UploadDragger>
  </Modal>
</template>
