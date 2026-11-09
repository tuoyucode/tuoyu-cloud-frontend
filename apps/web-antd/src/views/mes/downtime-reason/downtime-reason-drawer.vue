<script lang="ts" setup>
import type { DowntimeReasonApi } from '#/api/mes/downtimeReason';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addDowntimeReason,
  getDowntimeReason,
  updateDowntimeReason,
} from '#/api/mes/downtimeReason';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的停机原因 ID；新增时为空 */
const reasonId = ref<string>();

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
      const values = (await formApi.getValues()) as DowntimeReasonApi.Form;
      await (reasonId.value
        ? updateDowntimeReason({ ...values, reasonId: reasonId.value })
        : addDowntimeReason(values));
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
    const data = drawerApi.getData() as undefined | { reasonId?: string };
    reasonId.value = data?.reasonId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (reasonId.value) {
        await formApi.setValues(await getDowntimeReason(reasonId.value));
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  reasonId.value
    ? $t('mes.downtimeReason.edit')
    : $t('mes.downtimeReason.create'),
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
