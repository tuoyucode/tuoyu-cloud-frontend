<script lang="ts" setup>
import type { OssApi } from '@tuoyu/shared/api/system/oss';
import type { UploadFile } from 'element-plus';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { getUploadConfig, uploadOss } from '@tuoyu/shared/api/system/oss';
import { errorMessageOf } from '@tuoyu/shared/utils/api-result';
import { ElMessage, ElProgress, ElUpload } from 'element-plus';

import { $t } from '#/locales';

import { formatFileSize, uploadAccept, uploadRejection } from './data';

const emit = defineEmits<{ success: [] }>();

/** 上传列表中的一项 */
interface UploadItem {
  name: string;
  percent: number;
  /** 失败原因 */
  reason?: string;
  status: 'done' | 'error' | 'uploading';
  uid: number;
}

/**
 * 本次打开后上传的文件（含进度与结果）。
 * Element Plus 的上传组件会把失败的文件从列表中移除，这里自己维护列表，失败的文件保留并显示原因
 */
const items = ref<UploadItem[]>([]);

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
      items.value = [];
      uploadedAny = false;
      loadConfig();
      return;
    }
    if (uploadedAny) {
      emit('success');
    }
  },
});

/** 上传前按服务端的限制检查，不符合时提示原因并返回 false */
function accepts(file: File): boolean {
  const current = config.value;
  if (!current) {
    return true;
  }
  const reason = uploadRejection(file, current);
  if (!reason) {
    return true;
  }
  ElMessage.warning(
    $t(reason, {
      name: file.name,
      size: formatFileSize(current.maxFileSize),
      types: current.allowedExtensions.join('、'),
    }),
  );
  return false;
}

/** 选择或拖入文件后立即上传 */
async function onChange(uploadFile: UploadFile) {
  const file = uploadFile.raw;
  if (!file || !accepts(file)) {
    return;
  }
  items.value.push({
    name: file.name,
    percent: 0,
    status: 'uploading',
    uid: uploadFile.uid,
  });
  // 取响应式代理，进度与结果的修改才会刷新列表
  const item = items.value.at(-1) as UploadItem;
  try {
    await uploadOss(file, (percent) => {
      item.percent = percent;
    });
    item.percent = 100;
    item.status = 'done';
    uploadedAny = true;
  } catch (error) {
    // 失败原因已由请求层提示，这里记在列表中；优先使用后端的 message（例如超过上传上限时的 413 提示）
    item.status = 'error';
    item.reason = errorMessageOf(error, $t('system.oss.uploadFailedUnknown'));
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
    <ElUpload
      :accept="accept"
      :auto-upload="false"
      :on-change="onChange"
      :show-file-list="false"
      class="w-full"
      drag
      multiple
      name="file"
    >
      <div class="flex justify-center">
        <IconifyIcon class="size-10 text-primary" icon="lucide:upload" />
      </div>
      <div class="el-upload__text mt-2">{{ $t('system.oss.uploadHint') }}</div>
      <p v-if="typeHint" class="mt-1 text-xs text-muted-foreground">
        {{ typeHint }}
      </p>
      <p v-if="limitHint" class="mt-1 text-xs text-muted-foreground">
        {{ limitHint }}
      </p>
    </ElUpload>

    <ul v-if="items.length > 0" class="mt-3 space-y-2">
      <li v-for="item in items" :key="item.uid" class="text-sm">
        <div class="flex items-center gap-2">
          <IconifyIcon
            v-if="item.status === 'done'"
            class="size-4 shrink-0 text-success"
            icon="lucide:circle-check"
          />
          <IconifyIcon
            v-else-if="item.status === 'error'"
            class="size-4 shrink-0 text-destructive"
            icon="lucide:circle-x"
          />
          <IconifyIcon
            v-else
            class="size-4 shrink-0 text-muted-foreground"
            icon="lucide:file"
          />
          <span
            :class="{ 'text-destructive': item.status === 'error' }"
            class="min-w-0 flex-1 truncate"
          >
            {{ item.name }}
          </span>
        </div>
        <ElProgress
          v-if="item.status === 'uploading'"
          :percentage="item.percent"
          :stroke-width="4"
          class="mt-1 pl-6"
        />
        <p
          v-else-if="item.status === 'error' && item.reason"
          class="mt-1 pl-6 text-xs text-destructive"
        >
          {{ item.reason }}
        </p>
      </li>
    </ul>
  </Modal>
</template>
