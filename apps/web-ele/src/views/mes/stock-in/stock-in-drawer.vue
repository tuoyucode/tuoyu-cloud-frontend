<script lang="ts" setup>
import type { StockInApi } from '@tuoyu/shared/api/mes/stockIn';

import { useVbenDrawer } from '@vben/common-ui';

import { addStockIn } from '@tuoyu/shared/api/mes/stockIn';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  handleValuesChange(_values, fieldsChanged) {
    // 换了仓库后，已选的库位不属于新仓库，清空
    if (fieldsChanged.includes('warehouseId')) {
      formApi.setFieldValue('locationId', undefined);
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
      const values = (await formApi.getValues()) as StockInApi.Form;
      await addStockIn(values);
      ElMessage.success($t('crud.saved'));
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
    :title="$t('mes.stockIn.create')"
    class="w-full max-w-[560px]"
  >
    <Form />
  </Drawer>
</template>
