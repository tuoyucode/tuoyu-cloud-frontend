<script lang="ts" setup>
import type { TreeNode } from '@tuoyu/shared/api/types';
import type { UploadProps } from 'ant-design-vue';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { getCategoryTree } from '@tuoyu/shared/api/workflow/category';
import { importDefinition } from '@tuoyu/shared/api/workflow/definition';
import { Alert, message, TreeSelect, Upload } from 'ant-design-vue';

import { $t } from '#/locales';

const emit = defineEmits<{ success: [] }>();

const file = ref<File>();
const category = ref<string>();
const categories = ref<TreeNode<string>[]>([]);

const beforeUpload: UploadProps['beforeUpload'] = (selected) => {
  file.value = selected as unknown as File;
  // 不自动上传，点击“导入”时再提交
  return false;
};

function onRemove() {
  file.value = undefined;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!category.value) {
      message.warning($t('workflow.processDefinition.importCategoryRequired'));
      return;
    }
    if (!file.value) {
      message.warning($t('workflow.processDefinition.importFileRequired'));
      return;
    }
    modalApi.lock();
    try {
      await importDefinition(file.value, category.value);
      message.success($t('workflow.processDefinition.imported'));
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
      <Alert
        :message="$t('workflow.processDefinition.importHelp')"
        show-icon
        type="info"
      />
      <div class="flex flex-col gap-1">
        <span>{{ $t('workflow.common.category') }}</span>
        <TreeSelect
          v-model:value="category"
          :field-names="{ children: 'children', label: 'label', value: 'id' }"
          :placeholder="$t('crud.selectPlaceholder')"
          :tree-data="categories"
          tree-default-expand-all
        />
      </div>
      <Upload.Dragger
        :before-upload="beforeUpload"
        :file-list="file ? [{ uid: '1', name: file.name, status: 'done' }] : []"
        :max-count="1"
        accept=".json,application/json"
        @remove="onRemove"
      >
        <p class="py-4">{{ $t('workflow.processDefinition.importDrop') }}</p>
      </Upload.Dragger>
    </div>
  </Modal>
</template>
