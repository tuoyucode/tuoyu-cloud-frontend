<script lang="ts" setup>
import type { DefectApi } from '@tuoyu/shared/api/mes/defect';

import { useVbenDrawer } from '@vben/common-ui';

import { addDefect } from '@tuoyu/shared/api/mes/defect';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  handleValuesChange(_values, fieldsChanged) {
    // 换了工单后，已选的工序不属于新工单，清空
    if (fieldsChanged.includes('workorderId')) {
      formApi.setFieldValue('taskId', undefined);
    }
  },
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
    const values = (await formApi.getValues()) as DefectApi.Form;
    if (!(Number(values.defectQty) > 0)) {
      message.warning($t('mes.defect.defectQtyPositive'));
      return;
    }
    drawerApi.lock();
    try {
      await addDefect(values);
      message.success($t('crud.saved'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      await formApi.resetForm();
    }
  },
});
</script>

<template>
  <Drawer
    :confirm-text="$t('mes.defect.register')"
    :title="$t('mes.defect.create')"
    class="w-full max-w-[640px]"
  >
    <Form />
  </Drawer>
</template>
