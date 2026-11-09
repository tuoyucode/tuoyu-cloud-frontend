<script lang="ts" setup>
import type { DictApi } from '@tuoyu/shared/api/system/dict';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addDictType,
  getDictType,
  updateDictType,
} from '@tuoyu/shared/api/system/dict';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useTypeFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的字典类型 ID；新增时为空 */
const dictId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useTypeFormSchema(),
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
      const values = (await formApi.getValues()) as DictApi.DictTypeForm;
      await (dictId.value
        ? updateDictType({ ...values, dictId: dictId.value })
        : addDictType(values));
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
    const data = drawerApi.getData() as undefined | { dictId?: string };
    dictId.value = data?.dictId;
    await formApi.resetForm();
    if (!dictId.value) {
      return;
    }
    drawerApi.lock();
    try {
      await formApi.setValues(await getDictType(dictId.value));
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  dictId.value ? $t('system.dict.editType') : $t('system.dict.createType'),
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
