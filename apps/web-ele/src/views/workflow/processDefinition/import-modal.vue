<script lang="ts" setup>
import type { TreeNode } from '@tuoyu/shared/api/types';
import type { UploadFile, UploadUserFile } from 'element-plus';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { getCategoryTree } from '@tuoyu/shared/api/workflow/category';
import { importDefinition } from '@tuoyu/shared/api/workflow/definition';
import { ElAlert, ElMessage, ElTreeSelect, ElUpload } from 'element-plus';

import { $t } from '#/locales';

const emit = defineEmits<{ success: [] }>();

const file = ref<File>();
const category = ref<string>();
const categories = ref<TreeNode<string>[]>([]);

/** 已选的文件：只保留一个，重新选择时替换 */
const fileList = computed<UploadUserFile[]>(() =>
  file.value ? [{ name: file.value.name, status: 'ready', uid: 1 }] : [],
);

/** 不自动上传，点击“导入”时再提交 */
function onFileChange(selected: UploadFile) {
  if (selected.raw) {
    file.value = selected.raw;
  }
}

function onRemove() {
  file.value = undefined;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!category.value) {
      ElMessage.warning(
        $t('workflow.processDefinition.importCategoryRequired'),
      );
      return;
    }
    if (!file.value) {
      ElMessage.warning($t('workflow.processDefinition.importFileRequired'));
      return;
    }
    modalApi.lock();
    try {
      await importDefinition(file.value, category.value);
      ElMessage.success($t('workflow.processDefinition.imported'));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData() as undefined | { category?: string };
    file.value = undefined;
    category.value = data?.category;
    try {
      categories.value = await getCategoryTree();
    } catch {
      // 错误提示已由请求层弹出；分类下拉为空，用户可关闭后重试
      categories.value = [];
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('workflow.processDefinition.import')"
    :title="$t('workflow.processDefinition.importTitle')"
    class="w-full max-w-[560px]"
  >
    <div class="flex flex-col gap-4">
      <ElAlert
        :closable="false"
        :title="$t('workflow.processDefinition.importHelp')"
        show-icon
        type="info"
      />
      <div class="flex flex-col gap-1">
        <span>{{ $t('workflow.common.category') }}</span>
        <!-- 任意一级分类都可以选，不只是末级 -->
        <ElTreeSelect
          v-model="category"
          :data="categories"
          :placeholder="$t('crud.selectPlaceholder')"
          :props="{ children: 'children', label: 'label' }"
          check-strictly
          class="w-full"
          default-expand-all
          node-key="id"
        />
      </div>
      <ElUpload
        :auto-upload="false"
        :file-list="fileList"
        :on-change="onFileChange"
        :on-remove="onRemove"
        accept=".json,application/json"
        drag
      >
        <p class="py-4">{{ $t('workflow.processDefinition.importDrop') }}</p>
      </ElUpload>
    </div>
  </Modal>
</template>
