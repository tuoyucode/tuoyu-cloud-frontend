<script lang="ts" setup>
import type { AndonApi } from '@tuoyu/shared/api/mes/andon';

import { useVbenDrawer } from '@vben/common-ui';

import { reportAndon } from '@tuoyu/shared/api/mes/andon';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useReportSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  // 上级变化时清空下级，避免提交不属于所选车间（产线）的产线、工位、设备
  handleValuesChange(_values, fieldsChanged) {
    if (fieldsChanged.includes('workshopId')) {
      formApi.setFieldValue('lineId', undefined);
      formApi.setFieldValue('stationId', undefined);
      formApi.setFieldValue('deviceId', undefined);
    } else if (fieldsChanged.includes('lineId')) {
      formApi.setFieldValue('stationId', undefined);
    }
  },
  layout: 'vertical',
  schema: useReportSchema(),
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
      await reportAndon((await formApi.getValues()) as AndonApi.Report);
      message.success($t('mes.andon.reported'));
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
    :confirm-text="$t('mes.andon.report')"
    :title="$t('mes.andon.reportTitle')"
    class="w-full max-w-[600px]"
  >
    <Form />
  </Drawer>
</template>
