<script lang="ts" setup>
import type { InspectionApi } from '@tuoyu/shared/api/mes/inspection';

import { useVbenDrawer } from '@vben/common-ui';

import { addInspection } from '@tuoyu/shared/api/mes/inspection';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  handleValuesChange(_values, fieldsChanged) {
    // 换了工单或检验类型后，已选的工序与方案可能不适用，清空
    if (fieldsChanged.includes('workorderId')) {
      formApi.setFieldValue('taskId', undefined);
      formApi.setFieldValue('schemeId', undefined);
    } else if (fieldsChanged.includes('inspectionType')) {
      formApi.setFieldValue('schemeId', undefined);
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
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as InspectionApi.Form;
      await addInspection(values);
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
    :confirm-text="$t('crud.save')"
    :title="$t('mes.inspection.create')"
    class="w-full max-w-[640px]"
  >
    <Form />
  </Drawer>
</template>
