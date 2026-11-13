<script lang="ts" setup>
import type { WorkorderApi } from '@tuoyu/shared/api/mes/workorder';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addWorkorder,
  getWorkorder,
  updateWorkorder,
} from '@tuoyu/shared/api/mes/workorder';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的工单 ID；新增时为空 */
const workorderId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 表单值转为接口参数：编号由后端生成，不提交 */
function toForm(values: Record<string, any>): WorkorderApi.Form {
  const { workorderCode: _code, ...rest } = values;
  return rest as WorkorderApi.Form;
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = toForm(await formApi.getValues());
      await (workorderId.value
        ? updateWorkorder({ ...values, workorderId: workorderId.value })
        : addWorkorder(values));
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
    const data = drawerApi.getData() as undefined | { workorderId?: string };
    workorderId.value = data?.workorderId;
    await formApi.resetForm();
    if (!workorderId.value) {
      return;
    }
    drawerApi.lock();
    try {
      const detail = await getWorkorder(workorderId.value);
      const { tasks: _tasks, ...values } = detail;
      await formApi.setValues(values);
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  workorderId.value ? $t('mes.workorder.edit') : $t('mes.workorder.create'),
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
