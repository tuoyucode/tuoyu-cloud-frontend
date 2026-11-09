<script lang="ts" setup>
import type { InspectionSchemeApi } from '@tuoyu/shared/api/mes/inspectionScheme';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addInspectionScheme,
  getInspectionScheme,
  updateInspectionScheme,
} from '@tuoyu/shared/api/mes/inspectionScheme';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的方案 ID；新增时为空 */
const schemeId = ref<string>();

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
      const values = (await formApi.getValues()) as InspectionSchemeApi.Form;
      // 适用产品、工序为空表示不限，修改时也要提交空值
      const data = {
        ...values,
        materialId: values.materialId || undefined,
        operationCode: values.operationCode?.trim() || undefined,
      };
      await (schemeId.value
        ? updateInspectionScheme({ ...data, schemeId: schemeId.value })
        : addInspectionScheme(data));
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
    const data = drawerApi.getData() as undefined | { schemeId?: string };
    schemeId.value = data?.schemeId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (schemeId.value) {
        await formApi.setValues(await getInspectionScheme(schemeId.value));
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  schemeId.value
    ? $t('mes.inspectionScheme.edit')
    : $t('mes.inspectionScheme.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[640px]"
  >
    <Form />
  </Drawer>
</template>
