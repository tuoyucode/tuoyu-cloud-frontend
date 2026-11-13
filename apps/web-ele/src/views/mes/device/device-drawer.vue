<script lang="ts" setup>
import type { DeviceApi } from '@tuoyu/shared/api/mes/device';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addDevice,
  getDevice,
  updateDevice,
} from '@tuoyu/shared/api/mes/device';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, LOCATION_FIELDS, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的设备 ID；新增时为空 */
const deviceId = ref<string>();

/**
 * 各级位置最近一次的值。填充表单时同步记录，避免把填充当作用户切换上级而清空下级
 */
const lastLocation: Record<string, string | undefined> = {};

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    // 上级变化时清空它下面的各级
    LOCATION_FIELDS.forEach((field, index) => {
      const value = values[field] as string | undefined;
      if (!fieldsChanged.includes(field) || value === lastLocation[field]) {
        return;
      }
      lastLocation[field] = value;
      LOCATION_FIELDS.slice(index + 1).forEach((child) => {
        lastLocation[child] = undefined;
        formApi.setFieldValue(child, undefined);
      });
    });
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

function rememberLocation(data?: Partial<DeviceApi.Device>) {
  LOCATION_FIELDS.forEach((field) => {
    lastLocation[field] = data?.[field] ?? undefined;
  });
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as DeviceApi.Form;
      await (deviceId.value
        ? updateDevice({ ...values, deviceId: deviceId.value })
        : addDevice(values));
      ElMessage.success($t('crud.saved'));
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
    const data = drawerApi.getData() as undefined | { deviceId?: string };
    deviceId.value = data?.deviceId;
    rememberLocation();
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (deviceId.value) {
        const device = await getDevice(deviceId.value);
        rememberLocation(device);
        await formApi.setValues(device);
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  deviceId.value ? $t('mes.device.edit') : $t('mes.device.create'),
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
