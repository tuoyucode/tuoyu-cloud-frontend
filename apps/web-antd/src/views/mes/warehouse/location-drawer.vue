<script lang="ts" setup>
import type { LocationApi } from '@tuoyu/shared/api/mes/location';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addLocation,
  getLocation,
  updateLocation,
} from '@tuoyu/shared/api/mes/location';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useLocationFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

type OpenData = {
  /** 编辑时的库位 ID；新增时为空 */
  locationId?: string;
  warehouseId: string;
  warehouseName?: string;
};

const locationId = ref<string>();
const warehouseId = ref('');

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useLocationFormSchema(),
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
      const values = (await formApi.getValues()) as LocationApi.Form;
      const data = { ...values, warehouseId: warehouseId.value };
      await (locationId.value
        ? updateLocation({ ...data, locationId: locationId.value })
        : addLocation(data));
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
    const data = drawerApi.getData() as OpenData;
    locationId.value = data.locationId;
    warehouseId.value = data.warehouseId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      const location = locationId.value
        ? await getLocation(locationId.value)
        : undefined;
      await formApi.setValues({
        ...location,
        warehouseName: location?.warehouseName ?? data.warehouseName,
      });
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  locationId.value
    ? $t('mes.warehouse.location.edit')
    : $t('mes.warehouse.location.create'),
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
