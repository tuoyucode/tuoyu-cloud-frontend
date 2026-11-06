<script lang="ts" setup>
import type { ConfigApi } from '#/api/system/config';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { addConfig, getConfig, updateConfig } from '#/api/system/config';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的参数 ID；新增时为空 */
const configId = ref<string>();

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
      const values = (await formApi.getValues()) as ConfigApi.Form;
      await (configId.value
        ? updateConfig({ ...values, configId: configId.value })
        : addConfig(values));
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
    const data = drawerApi.getData() as undefined | { configId?: string };
    configId.value = data?.configId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        {
          componentProps: { options: options.configType },
          fieldName: 'configType',
        },
      ]);
      if (configId.value) {
        await formApi.setValues(await getConfig(configId.value));
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  configId.value ? $t('system.config.edit') : $t('system.config.create'),
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
