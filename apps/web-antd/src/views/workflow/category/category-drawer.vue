<script lang="ts" setup>
import type { CategoryApi } from '@tuoyu/shared/api/workflow/category';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addCategory,
  getCategory,
  listCategory,
  updateCategory,
} from '@tuoyu/shared/api/workflow/category';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { buildParentTree, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的分类 ID；新增时为空 */
const categoryId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as CategoryApi.Form;
      await (categoryId.value
        ? updateCategory({ ...values, categoryId: categoryId.value })
        : addCategory(values));
      message.success($t('crud.saved'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData() as
      | undefined
      | { categoryId?: string; values?: Partial<CategoryApi.Form> };
    categoryId.value = data?.categoryId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const [list, record] = await Promise.all([
        listCategory(),
        categoryId.value ? getCategory(categoryId.value) : undefined,
      ]);
      formApi.updateSchema([
        {
          componentProps: {
            treeData: buildParentTree(list, categoryId.value),
          },
          fieldName: 'parentId',
        },
      ]);
      if (record) {
        await formApi.setValues(record);
      } else if (data?.values) {
        // 新增时的预填值，例如“新增下级”的上级分类
        await formApi.setValues(data.values);
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  categoryId.value
    ? $t('workflow.category.edit')
    : $t('workflow.category.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[560px]"
  >
    <Form />
  </Drawer>
</template>
