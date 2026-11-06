<script lang="ts" setup>
import type { DictApi } from '#/api/system/dict';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { addDictData, getDictData, updateDictData } from '#/api/system/dict';
import { $t } from '#/locales';

import { loadDataFormOptions, useDataFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的字典数据 ID；新增时为空 */
const dictCode = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useDataFormSchema(),
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
      const values = (await formApi.getValues()) as DictApi.DictDataForm;
      await (dictCode.value
        ? updateDictData({ ...values, dictCode: dictCode.value })
        : addDictData(values));
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
      | { dictCode?: string; dictType: string };
    dictCode.value = data?.dictCode;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadDataFormOptions();
      formApi.updateSchema([
        {
          componentProps: { options: options.isDefault },
          fieldName: 'isDefault',
        },
      ]);
      await (dictCode.value
        ? formApi.setValues(await getDictData(dictCode.value))
        : formApi.setValues({ dictType: data?.dictType }));
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  dictCode.value ? $t('system.dict.editData') : $t('system.dict.createData'),
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
