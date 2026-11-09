<script lang="ts" setup>
import type { StationApi } from '#/api/mes/station';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { addStation, getStation, updateStation } from '#/api/mes/station';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的工厂 ID；新增时为空 */
const stationId = ref<string>();

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
      const values = (await formApi.getValues()) as StationApi.Form;
      await (stationId.value
        ? updateStation({ ...values, stationId: stationId.value })
        : addStation(values));
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
    const data = drawerApi.getData() as undefined | { stationId?: string };
    stationId.value = data?.stationId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (stationId.value) {
        await formApi.setValues(await getStation(stationId.value));
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  stationId.value ? $t('mes.station.edit') : $t('mes.station.create'),
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
