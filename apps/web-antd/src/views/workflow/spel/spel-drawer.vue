<script lang="ts" setup>
import type { SpelApi } from '#/api/workflow/spel';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { DictType, getDictOptions } from '#/api/system/dict';
import { addSpel, getSpel, updateSpel } from '#/api/workflow/spel';
import { $t } from '#/locales';

import { composeSpel, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的 ID；新增时为空 */
const spelId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 按组件名、方法名、参数填入表达式 */
async function onCompose() {
  const values = await formApi.getValues();
  const spel = composeSpel(
    values.componentName,
    values.methodName,
    values.methodParams,
  );
  if (!spel) {
    message.warning($t('workflow.spel.composeHelp'));
    return;
  }
  await formApi.setFieldValue('viewSpel', spel);
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as SpelApi.Form;
      await (spelId.value
        ? updateSpel({ ...values, id: spelId.value })
        : addSpel(values));
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
    const data = drawerApi.getData() as undefined | { id?: string };
    spelId.value = data?.id;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const [statusOptions, record] = await Promise.all([
        getDictOptions(DictType.NORMAL_DISABLE),
        spelId.value ? getSpel(spelId.value) : undefined,
      ]);
      formApi.updateSchema([
        { componentProps: { options: statusOptions }, fieldName: 'status' },
      ]);
      if (record) {
        await formApi.setValues(record);
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  spelId.value ? $t('workflow.spel.edit') : $t('workflow.spel.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[640px]"
  >
    <Form />
    <template #prepend-footer>
      <Button @click="onCompose">{{ $t('workflow.spel.compose') }}</Button>
    </template>
  </Drawer>
</template>
