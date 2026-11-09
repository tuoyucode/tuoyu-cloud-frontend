<script lang="ts" setup>
import type { WarehouseApi } from '@tuoyu/shared/api/mes/warehouse';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addWarehouse,
  getWarehouse,
  updateWarehouse,
} from '@tuoyu/shared/api/mes/warehouse';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useWarehouseFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的仓库 ID；新增时为空 */
const warehouseId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useWarehouseFormSchema(),
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
      const values = (await formApi.getValues()) as WarehouseApi.Form;
      await (warehouseId.value
        ? updateWarehouse({ ...values, warehouseId: warehouseId.value })
        : addWarehouse(values));
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
    const data = drawerApi.getData() as undefined | { warehouseId?: string };
    warehouseId.value = data?.warehouseId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (warehouseId.value) {
        await formApi.setValues(await getWarehouse(warehouseId.value));
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  warehouseId.value ? $t('mes.warehouse.edit') : $t('mes.warehouse.create'),
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
