<script lang="ts" setup>
import type { DefinitionApi } from '@tuoyu/shared/api/workflow/definition';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addDefinition,
  getDefinition,
  updateDefinition,
} from '@tuoyu/shared/api/workflow/definition';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的流程定义 ID；新增时为空 */
const definitionId = ref<string>();

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
      const values = (await formApi.getValues()) as DefinitionApi.Form;
      const data: DefinitionApi.Form = {
        ...values,
        // 不使用自定义表单时不保留表单路径
        formPath: values.formCustom === 'Y' ? values.formPath : '',
      };
      await (definitionId.value
        ? updateDefinition({ ...data, id: definitionId.value })
        : addDefinition(data));
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
      | { category?: string; id?: string };
    definitionId.value = data?.id;
    await formApi.resetForm();
    // 设计器模式只在新增时选择
    formApi.updateSchema([
      {
        componentProps: { disabled: !!definitionId.value },
        fieldName: 'modelValue',
      },
    ]);
    if (!definitionId.value) {
      if (data?.category) {
        await formApi.setFieldValue('category', data.category);
      }
      return;
    }
    drawerApi.lock();
    try {
      const record = await getDefinition(definitionId.value);
      await formApi.setValues({
        category: record.category,
        flowCode: record.flowCode,
        flowName: record.flowName,
        formCustom: record.formCustom || 'N',
        formPath: record.formPath,
        modelValue: record.modelValue || 'CLASSICS',
      });
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  definitionId.value
    ? $t('workflow.processDefinition.edit')
    : $t('workflow.processDefinition.create'),
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
